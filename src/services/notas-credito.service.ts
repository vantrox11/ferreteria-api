/**
 * MODELO DE NOTAS DE CRÉDITO
 * 
 * Gestiona la lógica de negocio para:
 * - Emisión de Notas de Crédito (anulación/corrección)
 * - Devolución automática de stock al inventario
 * - Ajuste automático de cuentas por cobrar
 * - Envío a SUNAT (vía Mock o Real)
 * - Series controladas por tabla Series (no hardcoded)
 * 
 * ACTUALIZADO: Usa Decimal.js para precisión exacta en cálculos monetarios
 */

import { db, dbBase } from '../config/db';
import { CreateNotaCreditoDTO } from '../dtos/nota-credito.dto';
import { obtenerFacturador, type DatosNotaCredito } from '../services/facturador.service';
import { Prisma, Series_tipo_comprobante } from '@prisma/client';
import { obtenerSerieActiva, incrementarCorrelativo, obtenerTipoComprobanteNC } from '../utils/series.helper';
import Decimal from 'decimal.js';

// Configurar Decimal.js para alta precisión
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const FACTOR_IGV = new Decimal('1.18');
const TASA_IGV_DECIMAL = new Decimal('0.18');

/**
 * Calcula totales fiscales de la Nota de Crédito
 * Usa Decimal.js para precisión exacta
 * Retorna: total gravado, total IGV, total final
 */
function calcularTotalesNC(detalles: CreateNotaCreditoDTO['detalles']) {
  let totalGravado = new Decimal(0);
  let totalIGV = new Decimal(0);

  for (const detalle of detalles) {
    const precioUnitario = new Decimal(detalle.precio_unitario);
    const cantidad = new Decimal(detalle.cantidad);
    const subtotal = precioUnitario.times(cantidad);

    // Descomponer: precio_unitario = valor_unitario + IGV
    // valor_unitario = precio_unitario / 1.18
    const valorUnitario = precioUnitario.dividedBy(FACTOR_IGV);
    const igvItem = subtotal.minus(valorUnitario.times(cantidad));

    totalGravado = totalGravado.plus(valorUnitario.times(cantidad));
    totalIGV = totalIGV.plus(igvItem);
  }

  const total = totalGravado.plus(totalIGV);

  return {
    totalGravado: totalGravado.toDecimalPlaces(2).toNumber(),
    totalIGV: totalIGV.toDecimalPlaces(2).toNumber(),
    total: total.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Crea una Nota de Crédito y ejecuta las acciones asociadas
 * 
 * ALGORITMO COMPLEJO:
 * 1. Validar que la venta exista y sea válida
 * 2. Validar que el monto de la NC no exceda el monto de la venta
 * 3. Obtener serie y correlativo
 * 4. [CRÍTICO] Si devolver_stock=true → Incrementar stock de productos
 * 5. [CRÍTICO] Si había cuenta por cobrar → Ajustar o anular deuda
 * 6. Crear registro de NC con detalles
 * 7. Enviar a SUNAT (Mock o Real)
 * 8. Actualizar estado de la venta original
 */
export const createNotaCredito = async (
  tenantId: number,
  data: CreateNotaCreditoDTO,
  usuarioId: number
) => {
  return dbBase.$transaction(async (tx) => {
    // 1. Obtener venta original con detalles
    const ventaOriginal = await tx.ventas.findFirst({
      where: {
        id: data.venta_referencia_id,
        tenant_id: tenantId,
      },
      include: {
        VentaDetalles: true,
        serie: true,
        CuentasPorCobrar: true,
        cliente: true,
      },
    });

    if (!ventaOriginal) {
      throw Object.assign(
        new Error('Venta no encontrada'),
        { code: 'VENTA_NOT_FOUND' }
      );
    }

    // ⚠️ REGLA DE INTEGRIDAD FISCAL: "El Candado SUNAT"
    // NO se puede emitir NC si la venta NO está ACEPTADA por SUNAT
    if (ventaOriginal.estado_sunat !== 'ACEPTADO') {
      throw Object.assign(
        new Error(
          `No se puede emitir Nota de Crédito. La venta original tiene estado SUNAT: ${ventaOriginal.estado_sunat}. ` +
          `Solo se pueden emitir NCs para comprobantes ACEPTADOS por SUNAT.`
        ),
        { code: 'VENTA_NO_ACEPTADA_SUNAT' }
      );
    }

    // 2. Validación crítica: Verificar si ya existe una anulación/devolución total
    const anulacionTotal = await tx.notasCredito.findFirst({
      where: {
        venta_referencia_id: data.venta_referencia_id,
        tenant_id: tenantId,
        OR: [
          { tipo_nota: 'ANULACION_DE_LA_OPERACION' },
          { tipo_nota: 'DEVOLUCION_TOTAL' },
        ],
        estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] }, // No contar rechazadas
      },
    });

    if (anulacionTotal) {
      throw Object.assign(
        new Error('Esta venta ya fue anulada totalmente. No se pueden emitir más notas de crédito.'),
        { code: 'VENTA_YA_ANULADA' }
      );
    }

    // 3. Calcular totales de la NC actual
    const totalesNC = calcularTotalesNC(data.detalles);

    // 4. Calcular saldo disponible (suma de NCs previas ACEPTADAS o PENDIENTES)
    const ncsPrevias = await tx.notasCredito.aggregate({
      where: {
        venta_referencia_id: data.venta_referencia_id,
        tenant_id: tenantId,
        estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
      },
      _sum: { monto_total: true },
    });

    const totalDevueltoHastaAhora = Number(ncsPrevias._sum.monto_total) || 0;
    const nuevoMonto = totalesNC.total;
    const totalVenta = Number(ventaOriginal.total);
    const saldoDisponible = totalVenta - totalDevueltoHastaAhora;

    console.log(`💰 [NC] Validación de saldo:`);
    console.log(`  Total venta: S/ ${totalVenta.toFixed(2)}`);
    console.log(`  Ya devuelto: S/ ${totalDevueltoHastaAhora.toFixed(2)}`);
    console.log(`  Saldo disponible: S/ ${saldoDisponible.toFixed(2)}`);
    console.log(`  Monto nuevo NC: S/ ${nuevoMonto.toFixed(2)}`);

    // 5. Validar que el nuevo monto no exceda el saldo disponible
    if (nuevoMonto > saldoDisponible) {
      throw Object.assign(
        new Error(
          `El monto excede el saldo disponible de la venta. ` +
          `Total venta: S/ ${totalVenta.toFixed(2)}, ` +
          `Ya devuelto: S/ ${totalDevueltoHastaAhora.toFixed(2)}, ` +
          `Saldo disponible: S/ ${saldoDisponible.toFixed(2)}`
        ),
        { code: 'MONTO_EXCEDE_SALDO_DISPONIBLE' }
      );
    }

    // 5.1. VALIDACIÓN CRÍTICA: Saldo a Favor del Cliente
    // Si la venta es a CREDITO y ya tiene pagos registrados, verificar que la NC no genere saldo a favor
    if (ventaOriginal.condicion_pago === 'CREDITO' && ventaOriginal.CuentasPorCobrar) {
      const cuentaPorCobrar = ventaOriginal.CuentasPorCobrar;
      const saldoPendienteActual = Number(cuentaPorCobrar.saldo_pendiente);

      // Si el monto de la NC es mayor que el saldo pendiente, el cliente ya pagó más de lo que debía
      if (nuevoMonto > saldoPendienteActual) {
        const saldoAFavor = nuevoMonto - saldoPendienteActual;

        console.warn(`⚠️ [NC] SALDO A FAVOR DEL CLIENTE detectado:`);
        console.warn(`  Saldo pendiente: S/ ${saldoPendienteActual.toFixed(2)}`);
        console.warn(`  Monto NC: S/ ${nuevoMonto.toFixed(2)}`);
        console.warn(`  Saldo a favor: S/ ${saldoAFavor.toFixed(2)}`);

        throw Object.assign(
          new Error(
            `⚠️ ALERTA: Esta Nota de Crédito genera un SALDO A FAVOR DEL CLIENTE.\n\n` +
            `El cliente debe recibir de vuelta: S/ ${saldoAFavor.toFixed(2)}\n\n` +
            `Detalle:\n` +
            `- Saldo pendiente actual: S/ ${saldoPendienteActual.toFixed(2)}\n` +
            `- Monto de la NC: S/ ${nuevoMonto.toFixed(2)}\n` +
            `- Cliente pagó: S/ ${Number(cuentaPorCobrar.monto_pagado).toFixed(2)}\n\n` +
            `Debe emitir un vale de devolución o registrar el saldo a favor para futuros consumos.`
          ),
          {
            code: 'SALDO_FAVOR_CLIENTE',
            saldo_a_favor: saldoAFavor,
            saldo_pendiente: saldoPendienteActual,
            monto_nc: nuevoMonto,
          }
        );
      }
    }

    // 6. Validación crítica: No permitir anulación total si ya hay devoluciones parciales
    if (
      (data.tipo_nota === 'ANULACION_DE_LA_OPERACION' || data.tipo_nota === 'DEVOLUCION_TOTAL') &&
      totalDevueltoHastaAhora > 0
    ) {
      throw Object.assign(
        new Error(
          `No se puede anular totalmente una venta que ya tiene devoluciones parciales. ` +
          `Monto ya devuelto: S/ ${totalDevueltoHastaAhora.toFixed(2)}`
        ),
        { code: 'NO_PUEDE_ANULAR_CON_PARCIALES' }
      );
    }

    console.log('✅ [NC] Validaciones de negocio pasadas correctamente');

    // 3. Obtener serie activa para NOTA_CREDITO
    const tipoComprobanteOriginal = ventaOriginal.serie?.tipo_comprobante || Series_tipo_comprobante.BOLETA;
    const tipoComprobanteNC = obtenerTipoComprobanteNC(tipoComprobanteOriginal);

    const serieActiva = await obtenerSerieActiva(tenantId, tipoComprobanteNC, undefined, tx);
    const nuevoCorrelativo = await incrementarCorrelativo(serieActiva.id, tx);

    console.log(`📄 [NC] Serie asignada: ${serieActiva.codigo}-${nuevoCorrelativo} (tipo: ${tipoComprobanteNC})`);

    // 4. [CRÍTICO] DEVOLUCIÓN DE STOCK (si corresponde)
    // TIPOS QUE REGRESAN STOCK: Anulación (01), Devolución Total (07), Devolución Parcial (07)
    // TIPOS QUE NO TOCAN STOCK: Descuento Global (08), Corrección de texto (03)
    if (data.devolver_stock &&
      (data.tipo_nota === 'ANULACION_DE_LA_OPERACION' ||
        data.tipo_nota === 'DEVOLUCION_TOTAL' ||
        data.tipo_nota === 'DEVOLUCION_PARCIAL')) {

      console.log('📦 [NC] Devolviendo stock al inventario...');

      for (const detalle of data.detalles) {
        // Incrementar stock del producto
        await tx.productos.update({
          where: { id: detalle.producto_id },
          data: {
            stock: {
              increment: detalle.cantidad,
            },
          },
        });

        console.log(`  ✅ Producto ID ${detalle.producto_id}: +${detalle.cantidad} unidades`);
      }
    }

    // 5. [CRÍTICO] AJUSTE DE DEUDA (si había crédito)
    // TIPOS QUE REDUCEN DEUDA: Anulación (01), Devolución Total/Parcial (07), Descuento Global (08)
    // TIPOS QUE NO TOCAN DEUDA: Corrección de texto (03)
    const tiposQueReducenDeuda = [
      'ANULACION_DE_LA_OPERACION',
      'DEVOLUCION_TOTAL',
      'DEVOLUCION_PARCIAL',
      'DESCUENTO_GLOBAL',
      'ANULACION_POR_ERROR_EN_EL_RUC',
    ];

    if (ventaOriginal.CuentasPorCobrar && tiposQueReducenDeuda.includes(data.tipo_nota)) {
      const cuentaPorCobrar = ventaOriginal.CuentasPorCobrar;

      console.log('💰 [NC] Ajustando cuenta por cobrar...');
      console.log(`  Saldo anterior: S/ ${cuentaPorCobrar.saldo_pendiente}`);

      // Si la NC anula TODA la venta → Cancelar deuda completa
      if (data.tipo_nota === 'DEVOLUCION_TOTAL' || data.tipo_nota === 'ANULACION_DE_LA_OPERACION') {
        await tx.cuentasPorCobrar.update({
          where: { id: cuentaPorCobrar.id },
          data: {
            estado: 'CANCELADA',
            saldo_pendiente: 0,
            monto_total: 0,
          },
        });

        console.log('  ✅ Deuda CANCELADA completamente');
      } else {
        // Devolución parcial, descuento global → Reducir el saldo pendiente
        const nuevoSaldo = Math.max(0, Number(cuentaPorCobrar.saldo_pendiente) - totalesNC.total);

        await tx.cuentasPorCobrar.update({
          where: { id: cuentaPorCobrar.id },
          data: {
            saldo_pendiente: nuevoSaldo,
            monto_total: Number(cuentaPorCobrar.monto_total) - totalesNC.total,
            estado: nuevoSaldo === 0 ? 'PAGADA' : cuentaPorCobrar.estado,
          },
        });

        console.log(`  ✅ Nuevo saldo: S/ ${nuevoSaldo}`);
      }

      // Estado de pago se deriva ahora de CuentasPorCobrar (Single Source of Truth)
      // Ya no actualizamos Ventas directamente
    } else if (data.tipo_nota === 'CORRECCION_POR_ERROR_EN_LA_DESCRIPCION') {
      console.log('📝 [NC] Tipo 03: Corrección de texto - NO afecta deuda ni stock');
    }

    // 5.1. [DEVOLUCIÓN EFECTIVO] Info para ventas al CONTADO
    if (ventaOriginal.condicion_pago === 'CONTADO' && tiposQueReducenDeuda.includes(data.tipo_nota) && data.devolver_efectivo) {
      console.log('💸 [NC] Se devolverá efectivo automáticamente');
      console.log(`  Monto: S/ ${totalesNC.total.toFixed(2)}`);
    }

    // 6. Crear la Nota de Crédito
    const notaCredito = await tx.notasCredito.create({
      data: {
        tenant_id: tenantId,
        serie_id: serieActiva.id,         // ✅ Relación con tabla Series
        numero: nuevoCorrelativo,          // ✅ Correlativo controlado
        tipo_nota: data.tipo_nota,
        motivo_sustento: data.motivo_sustento,
        monto_total: totalesNC.total,
        stock_retornado: data.devolver_stock,
        venta_referencia_id: data.venta_referencia_id,
        usuario_id: usuarioId,
        estado_sunat: 'PENDIENTE',
        fecha_emision: new Date(),
      },
    });

    // Crear detalles de la NC con cálculos precisos usando Decimal.js
    for (const detalle of data.detalles) {
      const precioUnitario = new Decimal(detalle.precio_unitario);
      const cantidad = new Decimal(detalle.cantidad);
      const valorUnitario = precioUnitario.dividedBy(FACTOR_IGV);
      const subtotal = precioUnitario.times(cantidad);
      const igvItem = subtotal.minus(valorUnitario.times(cantidad));

      await tx.notaCreditoDetalles.create({
        data: {
          tenant_id: tenantId,
          nota_credito_id: notaCredito.id,
          producto_id: detalle.producto_id,
          cantidad: cantidad.toNumber(),
          valor_unitario: valorUnitario.toDecimalPlaces(4).toNumber(),
          precio_unitario: precioUnitario.toNumber(),
          igv_total: igvItem.toDecimalPlaces(4).toNumber(),
          tasa_igv: TASA_IGV_DECIMAL.toNumber(),
        },
      });
    }

    // 6.1. [DEVOLUCIÓN EFECTIVO] Crear movimiento de caja si checkbox activado
    if (data.devolver_efectivo && data.sesion_caja_id && ventaOriginal.condicion_pago === 'CONTADO' && tiposQueReducenDeuda.includes(data.tipo_nota)) {
      // 🔴 [VALIDACIÓN CRÍTICA] Verificar saldo de caja antes de crear egreso
      console.log('💰 [NC] Validando saldo de caja disponible...');

      // Obtener sesión de caja
      const sesionCaja = await tx.sesionesCaja.findFirst({
        where: {
          id: data.sesion_caja_id,
          tenant_id: tenantId,
        },
      });

      if (!sesionCaja) {
        throw Object.assign(
          new Error('Sesión de caja no encontrada'),
          { code: 'SESION_NO_ENCONTRADA' }
        );
      }

      if (sesionCaja.estado !== 'ABIERTA') {
        throw Object.assign(
          new Error('La sesión de caja no está abierta. No se puede registrar el egreso.'),
          { code: 'SESION_NO_ABIERTA' }
        );
      }

      // Calcular saldo actual de la sesión
      const movimientos = await tx.movimientosCaja.findMany({
        where: {
          sesion_caja_id: data.sesion_caja_id,
          tenant_id: tenantId,
        },
        select: {
          tipo: true,
          monto: true,
        },
      });

      const saldoCaja = movimientos.reduce((sum, m) => {
        return sum + (m.tipo === 'INGRESO' ? Number(m.monto) : -Number(m.monto));
      }, Number(sesionCaja.monto_inicial));

      const montoDevolucion = totalesNC.total;

      console.log(`  Saldo actual de caja: S/ ${saldoCaja.toFixed(2)}`);
      console.log(`  Monto a devolver: S/ ${montoDevolucion.toFixed(2)}`);

      // 🚫 BLOQUEO: Si no hay suficiente efectivo
      if (saldoCaja < montoDevolucion) {
        throw Object.assign(
          new Error(
            `❌ Saldo de caja insuficiente.\n\n` +
            `💰 Disponible en caja: S/ ${saldoCaja.toFixed(2)}\n` +
            `💸 Monto a devolver: S/ ${montoDevolucion.toFixed(2)}\n` +
            `⚠️ Faltante: S/ ${(montoDevolucion - saldoCaja).toFixed(2)}\n\n` +
            `Opciones:\n` +
            `1. Desmarca "Generar egreso automático" y registra la devolución manualmente más tarde\n` +
            `2. Deposita más efectivo en la caja antes de emitir esta NC\n` +
            `3. Reduce el monto de la Nota de Crédito`
          ),
          {
            code: 'SALDO_CAJA_INSUFICIENTE',
            data: {
              saldoDisponible: saldoCaja,
              montoRequerido: montoDevolucion,
              faltante: montoDevolucion - saldoCaja,
            }
          }
        );
      }

      console.log('  ✅ Validación de saldo: APROBADA');

      // Crear movimiento de egreso
      await tx.movimientosCaja.create({
        data: {
          tenant_id: tenantId,
          sesion_caja_id: data.sesion_caja_id,
          tipo: 'EGRESO',
          monto: totalesNC.total,
          descripcion: `Devolución automática por emisión de Nota de Crédito ${serieActiva.codigo}-${nuevoCorrelativo}`,
          nota_credito_id: notaCredito.id, // FK explícita
          es_manual: false,
        },
      });

      await tx.notasCredito.update({
        where: { id: notaCredito.id },
        data: {
          efectivo_devuelto: true,
          fecha_devolucion: new Date(),
        },
      });

      console.log(`  ✅ Efectivo devuelto: S/ ${totalesNC.total.toFixed(2)}`);
    }

    // 7. [ENVÍO A SUNAT] - Llamar al facturador (Mock o Real)
    console.log('📡 [NC] Enviando a SUNAT...');

    const datosParaSunat: DatosNotaCredito = {
      tipo_documento: tipoComprobanteOriginal as 'BOLETA' | 'FACTURA',
      serie: serieActiva.codigo,            // ✅ Usar código de la serie (ej: "FN01")
      numero: nuevoCorrelativo,             // ✅ Usar nuevo correlativo
      fecha_emision: new Date(),
      cliente_documento: null, // TODO: Obtener del cliente si existe
      cliente_nombre: 'CLIENTE', // TODO: Obtener del cliente

      documento_referencia_tipo: tipoComprobanteOriginal as 'BOLETA' | 'FACTURA',
      documento_referencia_serie: ventaOriginal.serie?.codigo || '',
      documento_referencia_numero: ventaOriginal.numero_comprobante || 0,
      tipo_nota: data.tipo_nota,
      motivo: data.motivo_sustento,

      items: data.detalles.map(d => {
        const precioUnitario = new Decimal(d.precio_unitario);
        const cantidad = new Decimal(d.cantidad);
        const valorUnitario = precioUnitario.dividedBy(FACTOR_IGV);
        const igvItem = precioUnitario.times(cantidad).times(TASA_IGV_DECIMAL).dividedBy(FACTOR_IGV);

        return {
          descripcion: `Producto ID ${d.producto_id}`, // TODO: Obtener nombre real
          cantidad: cantidad.toNumber(),
          precio_unitario: precioUnitario.toNumber(),
          valor_unitario: valorUnitario.toDecimalPlaces(4).toNumber(),
          igv_item: igvItem.toDecimalPlaces(4).toNumber(),
        };
      }),

      total_gravado: totalesNC.totalGravado,
      total_igv: totalesNC.totalIGV,
      total: totalesNC.total,
    };

    try {
      const facturador = obtenerFacturador();
      const respuestaSunat = await facturador.emitirNotaCredito(datosParaSunat);

      if (respuestaSunat.exito) {
        // Actualizar con datos de SUNAT
        await tx.notasCredito.update({
          where: { id: notaCredito.id },
          data: {
            estado_sunat: 'ACEPTADO',
            xml_url: respuestaSunat.xml_url,
            cdr_url: respuestaSunat.cdr_url,
            hash_cpe: respuestaSunat.hash_cpe,
          },
        });

        console.log('✅ [NC] ACEPTADA por SUNAT');
      } else {
        // Marcar como rechazada pero NO hacer rollback (ya se creó en BD)
        await tx.notasCredito.update({
          where: { id: notaCredito.id },
          data: {
            estado_sunat: 'RECHAZADO',
          },
        });

        console.error('❌ [NC] RECHAZADA por SUNAT:', respuestaSunat.mensaje);
      }
    } catch (error) {
      console.error('⚠️ [NC] Error al enviar a SUNAT:', error);
      // Marcar como pendiente para reintento
      await tx.notasCredito.update({
        where: { id: notaCredito.id },
        data: {
          estado_sunat: 'PENDIENTE',
        },
      });
    }

    return notaCredito;
  });
};

/**
 * Lista Notas de Crédito con paginación y filtros
 */
export const listNotasCredito = async (
  tenantId: number,
  filters: {
    page?: number;
    limit?: number;
    q?: string;
    venta_id?: number;
    estado_sunat?: string;
    tipo_nota?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.NotasCreditoWhereInput = {
    tenant_id: tenantId,
  };

  // Filtros
  if (filters.venta_id) {
    where.venta_referencia_id = filters.venta_id;
  }

  if (filters.estado_sunat) {
    where.estado_sunat = filters.estado_sunat as any;
  }

  if (filters.tipo_nota) {
    where.tipo_nota = filters.tipo_nota as any;
  }

  if (filters.fecha_inicio || filters.fecha_fin) {
    where.fecha_emision = {};
    if (filters.fecha_inicio) {
      where.fecha_emision.gte = filters.fecha_inicio;
    }
    if (filters.fecha_fin) {
      where.fecha_emision.lte = filters.fecha_fin;
    }
  }

  if (filters.q) {
    where.OR = [
      { serie: { codigo: { contains: filters.q } } },  // ✅ Buscar en serie.codigo
      { numero: isNaN(Number(filters.q)) ? undefined : Number(filters.q) },
    ];
  }

  const [data, total] = await Promise.all([
    db.notasCredito.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        serie: true,  // ✅ Incluir serie para mostrar código
        venta_referencia: {
          include: {
            serie: true,
            cliente: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
              },
            },
          },
        },
      },
    }),
    db.notasCredito.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtiene una Nota de Crédito por ID
 */
export const getNotaCreditoById = async (tenantId: number, id: number) => {
  const notaCredito = await db.notasCredito.findFirst({
    where: {
      id,
      tenant_id: tenantId,
    },
    include: {
      serie: true,  // ✅ Incluir serie
      venta_referencia: {
        include: {
          serie: true,
          cliente: true,
        },
      },
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      detalles: {
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
            },
          },
        },
      },
    },
  });

  if (!notaCredito) {
    throw Object.assign(
      new Error('Nota de Crédito no encontrada'),
      { code: 'NC_NOT_FOUND' }
    );
  }

  return notaCredito;
};

/**
 * Reenvía una NC rechazada/pendiente a SUNAT
 */
export const reenviarNotaCredito = async (tenantId: number, id: number) => {
  const notaCredito = await getNotaCreditoById(tenantId, id);

  if (notaCredito.estado_sunat === 'ACEPTADO') {
    throw Object.assign(
      new Error('La Nota de Crédito ya fue aceptada por SUNAT'),
      { code: 'NC_YA_ACEPTADA' }
    );
  }

  // TODO: Reconstruir datos y reenviar
  console.log('🔄 [NC] Reenviando a SUNAT...', id);

  // Por ahora, solo actualizar estado a PENDIENTE para indicar reintento
  return db.notasCredito.update({
    where: { id },
    data: {
      estado_sunat: 'PENDIENTE',
    },
  });
};
