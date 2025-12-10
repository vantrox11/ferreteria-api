/**
 * MODELO DE PAGOS
 * 
 * Gestiona la lógica de negocio para:
 * - Registro de pagos sobre Cuentas por Cobrar
 * - Amortización de deuda
 * - Actualización automática de saldos
 * - Cambio de estado de CxC (VIGENTE -> PAGADA)
 */

import { db, dbBase } from '../config/db';
import { CreatePagoDTO } from '../dtos/pago.dto';

/**
 * Registra un pago sobre una Cuenta por Cobrar y actualiza el saldo
 * 
 * ALGORITMO:
 * 1. Validar que la CxC exista y pertenezca al tenant
 * 2. Validar que el monto no exceda el saldo pendiente
 * 3. Crear registro de pago en tabla Pagos
 * 4. Recalcular saldo_pendiente de la CxC
 * 5. Actualizar estado de la CxC (VIGENTE/PAGADA)
 * 5. Registrar ingreso en MovimientosCaja (si hay sesión activa)
 * 7. [OPCIONAL] Registrar movimiento de caja si se especifica
 */
export const registrarPago = async (
  tenantId: number,
  cuentaId: number,
  data: CreatePagoDTO,
  usuarioId: number
) => {
  return dbBase.$transaction(async (tx) => {
    // 1. Validar que la CxC exista
    const cuentaPorCobrar = await tx.cuentasPorCobrar.findFirst({
      where: {
        id: cuentaId,
        tenant_id: tenantId,
      },
      include: {
        venta: true,
      },
    });

    if (!cuentaPorCobrar) {
      throw Object.assign(
        new Error('Cuenta por Cobrar no encontrada'),
        { code: 'CUENTA_NOT_FOUND' }
      );
    }

    // 2. Validar que la cuenta no esté ya cancelada
    if (cuentaPorCobrar.estado === 'CANCELADA') {
      throw Object.assign(
        new Error('No se pueden registrar pagos sobre una cuenta CANCELADA (anulada por Nota de Crédito)'),
        { code: 'CUENTA_CANCELADA' }
      );
    }

    // 3. Validar que el monto no exceda el saldo pendiente
    const saldoPendiente = Number(cuentaPorCobrar.saldo_pendiente);
    const montoPago = Number(data.monto);

    if (montoPago <= 0) {
      throw Object.assign(
        new Error('El monto del pago debe ser mayor a cero'),
        { code: 'MONTO_INVALIDO' }
      );
    }

    if (montoPago > saldoPendiente) {
      throw Object.assign(
        new Error(
          `El monto del pago (S/ ${montoPago.toFixed(2)}) excede el saldo pendiente (S/ ${saldoPendiente.toFixed(2)})`
        ),
        { code: 'MONTO_EXCEDE_SALDO' }
      );
    }

    console.log('💰 [PAGO] Registrando pago...');
    console.log(`  Cuenta ID: ${cuentaId}`);
    console.log(`  Saldo anterior: S/ ${saldoPendiente.toFixed(2)}`);
    console.log(`  Monto pago: S/ ${montoPago.toFixed(2)}`);

    // 4. Crear registro de pago
    const pago = await tx.pagos.create({
      data: {
        tenant_id: tenantId,
        cuenta_id: cuentaId,
        usuario_id: usuarioId,
        monto: data.monto,
        metodo_pago: data.metodo_pago as any,
        referencia: data.referencia,
        notas: data.notas,
        fecha_pago: new Date(),
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

    // 5. Recalcular saldo pendiente
    const nuevoSaldo = saldoPendiente - montoPago;
    const nuevoEstado = nuevoSaldo === 0 ? 'PAGADA' : cuentaPorCobrar.estado;

    await tx.cuentasPorCobrar.update({
      where: { id: cuentaId },
      data: {
        saldo_pendiente: nuevoSaldo,
        estado: nuevoEstado,
      },
    });

    console.log(`  ✅ Nuevo saldo: S/ ${nuevoSaldo.toFixed(2)}`);
    console.log(`  ✅ Nuevo estado CxC: ${nuevoEstado}`);

    // Estado de pago se deriva ahora de CuentasPorCobrar (Single Source of Truth)
    // Ya no actualizamos Ventas directamente

    // 6. [TRAZABILIDAD FINANCIERA] Registrar ingreso automático en caja
    if (data.sesion_caja_id && cuentaPorCobrar.venta) {
      // Obtener información de la venta para la descripción
      const ventaInfo = await tx.ventas.findFirst({
        where: { id: cuentaPorCobrar.venta.id },
        include: { serie: true },
      });

      const descripcion = ventaInfo?.serie
        ? `Pago por Venta ${ventaInfo.serie.codigo}-${ventaInfo.numero_comprobante}`
        : `Pago de cuenta por cobrar #${cuentaId}`;

      await tx.movimientosCaja.create({
        data: {
          tenant_id: tenantId,
          sesion_caja_id: data.sesion_caja_id,
          tipo: 'INGRESO',
          monto: montoPago,
          descripcion,
          pago_id: pago.id, // FK explícita
          es_manual: false,
        },
      });

      console.log(`  💰 Ingreso automático registrado en caja: S/ ${montoPago.toFixed(2)}`);
    }

    return pago;
  });
};

/**
 * Obtiene todos los pagos de una Cuenta por Cobrar
 */
export const getPagosByCuenta = async (tenantId: number, cuentaId: number) => {
  return db.pagos.findMany({
    where: {
      tenant_id: tenantId,
      cuenta_id: cuentaId,
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
    orderBy: {
      fecha_pago: 'desc',
    },
  });
};

/**
 * Obtiene el historial de pagos de un tenant (paginado)
 */
export const getPagosPaginados = async (
  tenantId: number,
  filters: {
    skip: number;
    take: number;
    cuenta_id?: number;
  }
) => {
  const where: any = { tenant_id: tenantId };

  if (filters.cuenta_id) {
    where.cuenta_id = filters.cuenta_id;
  }

  const [total, pagos] = await Promise.all([
    db.pagos.count({ where }),
    db.pagos.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        cuenta_por_cobrar: {
          select: {
            id: true,
            monto_total: true,
            saldo_pendiente: true,
            estado: true,
            venta: {
              select: {
                id: true,
                serie: {
                  select: {
                    codigo: true,
                    tipo_comprobante: true,
                  },
                },
                numero_comprobante: true,
                cliente: {
                  select: {
                    nombre: true,
                    razon_social: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        fecha_pago: 'desc',
      },
    }),
  ]);

  return { total, data: pagos };
};
