import { db, dbBase } from '../config/db';
import { Prisma } from '@prisma/client';
import { type CreatePagoDTO } from '../dtos/cobranza.dto';

/**
 * SEMÁFORO DE RIESGO CREDITICIO
 * Valida si el cliente puede realizar una compra a crédito
 * @throws Error si excede el límite de crédito disponible
 */
export const validarLineaCredito = async (
  tenantId: number,
  clienteId: number,
  montoNuevaVenta: number
): Promise<void> => {
  // Obtener datos del cliente
  const cliente = await db.clientes.findUnique({
    where: {
      id: clienteId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      nombre: true,
      limite_credito: true,
      dias_credito: true,
    },
  });

  if (!cliente) {
    throw new Error('Cliente no encontrado');
  }

  // Si el cliente no tiene crédito habilitado (limite = 0), rechazar
  if (Number(cliente.limite_credito) === 0) {
    throw Object.assign(
      new Error('Cliente no tiene línea de crédito habilitada'),
      { code: 'CREDITO_NO_HABILITADO' }
    );
  }

  // Calcular deuda actual (saldo_pendiente de todas las cuentas activas)
  const deudaActual = await db.cuentasPorCobrar.aggregate({
    where: {
      tenant_id: tenantId,
      cliente_id: clienteId,
      estado: {
        in: ['VIGENTE', 'POR_VENCER', 'VENCIDA'],
      },
    },
    _sum: {
      saldo_pendiente: true,
    },
  });

  const saldoPendiente = Number(deudaActual._sum.saldo_pendiente || 0);
  const limiteCredito = Number(cliente.limite_credito);
  const creditoDisponible = limiteCredito - saldoPendiente;

  // SEMÁFORO: Si la nueva venta excede el crédito disponible, rechazar
  if (montoNuevaVenta > creditoDisponible) {
    throw Object.assign(
      new Error(
        `Crédito insuficiente. Disponible: S/ ${creditoDisponible.toFixed(
          2
        )}, Requerido: S/ ${montoNuevaVenta.toFixed(2)}`
      ),
      {
        code: 'LIMITE_CREDITO_EXCEDIDO',
        data: {
          limiteCredito,
          deudaActual: saldoPendiente,
          creditoDisponible,
          montoSolicitado: montoNuevaVenta,
        },
      }
    );
  }

  // VALIDACIÓN: Cliente debe tener días de crédito configurados
  if (cliente.dias_credito === 0) {
    throw Object.assign(
      new Error('Cliente no tiene plazo de crédito configurado'),
      { code: 'DIAS_CREDITO_NO_CONFIGURADO' }
    );
  }
};

/**
 * Crea una cuenta por cobrar asociada a una venta a crédito
 * @param tx - Transacción de Prisma opcional. Si se proporciona, usa la transacción; si no, usa el cliente global
 */
export const createCuentaPorCobrar = async (
  tenantId: number,
  ventaId: number,
  clienteId: number,
  montoTotal: number,
  fechaVencimiento: Date,
  montoPagado: number = 0,
  tx?: any // Prisma.TransactionClient
) => {
  const saldoPendiente = montoTotal - montoPagado;

  const prismaClient = tx || db;

  return prismaClient.cuentasPorCobrar.create({
    data: {
      tenant_id: tenantId,
      venta_id: ventaId,
      cliente_id: clienteId,
      monto_total: montoTotal,
      monto_pagado: montoPagado,
      saldo_pendiente: saldoPendiente,
      fecha_vencimiento: fechaVencimiento,
      estado: saldoPendiente === 0 ? 'PAGADA' : 'VIGENTE',
    },
  });
};

/**
 * Registra un pago (amortización) en una cuenta por cobrar
 */
export const registrarPago = async (
  tenantId: number,
  cuentaId: number,
  pagoData: CreatePagoDTO,
  usuarioId: number
) => {
  return dbBase.$transaction(async (tx) => {
    // 1. Obtener cuenta por cobrar
    const cuenta = await tx.cuentasPorCobrar.findFirst({
      where: {
        id: cuentaId,
        tenant_id: tenantId,
      },
      include: {
        venta: true,
      },
    });

    if (!cuenta) {
      throw new Error('Cuenta por cobrar no encontrada');
    }

    // ✅ CRÍTICO: Validar estado de la cuenta
    if (cuenta.estado === 'PAGADA') {
      throw Object.assign(
        new Error('No se pueden registrar pagos en una cuenta ya pagada'),
        { code: 'CUENTA_YA_PAGADA' }
      );
    }

    if (cuenta.estado === 'CANCELADA') {
      throw Object.assign(
        new Error('No se pueden registrar pagos en una cuenta cancelada'),
        { code: 'CUENTA_CANCELADA' }
      );
    }

    // 2. Validar que el monto no exceda la deuda
    const saldoActual = Number(cuenta.saldo_pendiente);
    if (pagoData.monto > saldoActual) {
      throw Object.assign(
        new Error(
          `El monto del pago (S/ ${pagoData.monto.toFixed(
            2
          )}) excede la deuda pendiente (S/ ${saldoActual.toFixed(2)})`
        ),
        { code: 'MONTO_EXCEDE_DEUDA' }
      );
    }

    // 3. Crear registro de pago
    const pago = await tx.pagos.create({
      data: {
        tenant_id: tenantId,
        cuenta_id: cuentaId,
        monto: pagoData.monto,
        metodo_pago: pagoData.metodo_pago,
        referencia: pagoData.referencia,
        notas: pagoData.notas,
        usuario_id: usuarioId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    // 4. Actualizar cuenta por cobrar
    const nuevoMontoPagado = Number(cuenta.monto_pagado) + pagoData.monto;
    const nuevoSaldo = Number(cuenta.monto_total) - nuevoMontoPagado;

    let nuevoEstado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'PAGADA' | 'CANCELADA' = cuenta.estado;
    if (nuevoSaldo === 0) {
      nuevoEstado = 'PAGADA';
    } else if (nuevoSaldo < Number(cuenta.monto_total)) {
      // Mantener estado actual si es parcial, o marcar como VIGENTE si estaba vencida
      if (cuenta.estado === 'VIGENTE' || cuenta.estado === 'POR_VENCER') {
        nuevoEstado = 'VIGENTE';
      }
    }

    await tx.cuentasPorCobrar.update({
      where: { id: cuentaId },
      data: {
        monto_pagado: nuevoMontoPagado,
        saldo_pendiente: nuevoSaldo,
        fecha_ultimo_pago: new Date(),
        estado: nuevoEstado,
      },
    });

    // Estado de pago se deriva ahora de CuentasPorCobrar (Single Source of Truth)
    // Ya no actualizamos Ventas directamente

    // Mapear nombres de relaciones para compatibilidad con frontend
    return {
      ...pago,
      usuario: pago.usuario,
    };
  });
};

/**
 * Obtiene cuentas por cobrar con paginación y filtros
 */
export const findCobranzasPaginadas = async (
  tenantId: number,
  params: {
    skip: number;
    take: number;
    search?: string;
    cliente_id?: number;
    estado?: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'PAGADA' | 'CANCELADA';
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  const { skip, take, search, cliente_id, estado, fecha_inicio, fecha_fin } = params;

  const whereClause: Prisma.CuentasPorCobrarWhereInput = {
    tenant_id: tenantId,
    ...(cliente_id && { cliente_id }),
    ...(estado && { estado }),
    ...(fecha_inicio && { fecha_vencimiento: { gte: fecha_inicio } }),
    ...(fecha_fin && { fecha_vencimiento: { lte: fecha_fin } }),
    ...(search && {
      cliente: { nombre: { contains: search } },
    }),
  };

  const [total, data] = await dbBase.$transaction([
    db.cuentasPorCobrar.count({ where: whereClause }),
    db.cuentasPorCobrar.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { fecha_vencimiento: 'asc' },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            documento_identidad: true,
            ruc: true,
            telefono: true,
            email: true,
          },
        },
        venta: {
          select: {
            id: true,
            total: true,
            created_at: true,
            numero_comprobante: true,
            serie: {
              select: {
                codigo: true,
                tipo_comprobante: true,
              },
            },
          },
        },
        pagos: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
          },
          orderBy: {
            fecha_pago: 'desc',
          },
        },
      },
    }),
  ]);

  // Mapear nombres de relaciones para compatibilidad con frontend
  const mappedData = data.map(cuenta => ({
    ...cuenta,
    cliente: cuenta.cliente,
    venta: cuenta.venta,
    pagos: cuenta.pagos?.map(pago => ({
      ...pago,
      usuario: pago.usuario,
    })),
  }));

  return { total, data: mappedData };
};

/**
 * Obtiene cuenta por cobrar por ID con relaciones completas
 */
export const findCuentaPorCobrarById = async (tenantId: number, cuentaId: number) => {
  const cuenta = await db.cuentasPorCobrar.findFirst({
    where: {
      id: cuentaId,
      tenant_id: tenantId,
    },
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          documento_identidad: true,
          ruc: true,
          telefono: true,
          email: true,
          limite_credito: true,
          dias_credito: true,
        },
      },
      venta: {
        select: {
          id: true,
          total: true,
          created_at: true,
          numero_comprobante: true,
          serie: {
            select: {
              codigo: true,
              tipo_comprobante: true,
            },
          },
        },
      },
      pagos: {
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: {
          fecha_pago: 'desc',
        },
      },
    },
  });

  if (!cuenta) return null;

  // Mapear nombres de relaciones para compatibilidad con frontend
  return {
    ...cuenta,
    cliente: cuenta.cliente,
    venta: cuenta.venta,
    pagos: cuenta.pagos?.map(pago => ({
      ...pago,
      usuario: pago.usuario,
    })),
  };
};

/**
 * Obtiene resumen de cobranzas (estadísticas)
 */
export const getResumenCobranzas = async (tenantId: number) => {
  const ahora = new Date();
  const enSieteDias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [vigentes, vencidas, porVencer] = await Promise.all([
    // Cuentas vigentes
    db.cuentasPorCobrar.aggregate({
      where: {
        tenant_id: tenantId,
        estado: 'VIGENTE',
      },
      _count: true,
      _sum: { saldo_pendiente: true },
    }),
    // Cuentas vencidas
    db.cuentasPorCobrar.aggregate({
      where: {
        tenant_id: tenantId,
        estado: 'VENCIDA',
      },
      _count: true,
      _sum: { saldo_pendiente: true },
    }),
    // Cuentas por vencer en los próximos 7 días
    db.cuentasPorCobrar.aggregate({
      where: {
        tenant_id: tenantId,
        estado: { in: ['VIGENTE', 'POR_VENCER'] },
        fecha_vencimiento: {
          gte: ahora,
          lte: enSieteDias,
        },
      },
      _sum: { saldo_pendiente: true },
    }),
  ]);

  return {
    total_vigentes: vigentes._count,
    total_vencidas: vencidas._count,
    monto_vigente: Number(vigentes._sum.saldo_pendiente || 0),
    monto_vencido: Number(vencidas._sum.saldo_pendiente || 0),
    monto_por_vencer: Number(porVencer._sum.saldo_pendiente || 0),
  };
};

/**
 * Actualiza notas de una cuenta por cobrar
 */
export const updateCuentaPorCobrarNotas = async (
  tenantId: number,
  cuentaId: number,
  notas: string
) => {
  return db.cuentasPorCobrar.update({
    where: {
      id: cuentaId,
      tenant_id: tenantId,
    },
    data: { notas },
  });
};

/**
 * Job automático: Actualizar estados de cuentas según fecha de vencimiento
 * Debe ejecutarse diariamente (CRON job)
 */
export const actualizarEstadosCuentas = async (tenantId: number) => {
  const ahora = new Date();
  const enSieteDias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Marcar como VENCIDA las que pasaron la fecha
  await db.cuentasPorCobrar.updateMany({
    where: {
      tenant_id: tenantId,
      estado: { in: ['VIGENTE', 'POR_VENCER'] },
      fecha_vencimiento: { lt: ahora },
      saldo_pendiente: { gt: 0 },
    },
    data: { estado: 'VENCIDA' },
  });

  // Marcar como POR_VENCER las que vencen en los próximos 7 días
  await db.cuentasPorCobrar.updateMany({
    where: {
      tenant_id: tenantId,
      estado: 'VIGENTE',
      fecha_vencimiento: {
        gte: ahora,
        lte: enSieteDias,
      },
      saldo_pendiente: { gt: 0 },
    },
    data: { estado: 'POR_VENCER' },
  });
};
