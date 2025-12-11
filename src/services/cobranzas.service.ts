import { db, dbBase } from '../config/db';
import { Prisma } from '@prisma/client';
import { type CreatePagoDTO } from '../dtos/pago.dto';

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
 * ⚠️ NOTA: La función registrarPago fue ELIMINADA de este archivo.
 * 
 * RAZÓN: Esta función NO registraba el MovimientoCaja, causando descuadre financiero.
 * 
 * USO CORRECTO: Importar y usar registrarPago desde pagos.service.ts
 * que sí tiene la lógica completa de trazabilidad financiera.
 */

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

  // Mapear respuesta con relaciones incluidas
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

  // Mapear respuesta con relaciones incluidas
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
      _count: true,
      _sum: { saldo_pendiente: true },
    }),
  ]);

  const montoVigente = Number(vigentes._sum.saldo_pendiente || 0);
  const montoVencido = Number(vencidas._sum.saldo_pendiente || 0);
  const montoPorVencer = Number(porVencer._sum.saldo_pendiente || 0);

  return {
    total_vigentes: vigentes._count,
    total_vencidas: vencidas._count,
    total_por_vencer: porVencer._count,
    monto_total: montoVigente + montoVencido,
    monto_vigente: montoVigente,
    monto_vencido: montoVencido,
    monto_por_vencer: montoPorVencer,
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
