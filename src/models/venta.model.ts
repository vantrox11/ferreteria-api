import { db } from '../config/db';
import { Prisma } from '@prisma/client';
import { type CreateVentaDTO } from '../dtos/venta.dto';
import * as tenantModel from './tenant.model';
import { calcularTasaIGV, descomponerPrecioConIGV, type AfectacionIGV } from '../utils/fiscal.utils';
import { obtenerFacturador, type DatosComprobante } from '../services/facturador.service';
import * as inventarioService from '../services/inventario.service';

/**
 * Calcula la fecha de vencimiento basándose en los días de crédito del cliente
 */
const calcularFechaVencimiento = async (
  tx: Prisma.TransactionClient,
  tenantId: number,
  clienteId: number
): Promise<Date> => {
  const cliente = await tx.clientes.findFirst({
    where: { id: clienteId, tenant_id: tenantId },
    select: { dias_credito: true },
  });

  const diasCredito = cliente?.dias_credito ?? 30; // Default 30 días
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);

  return fechaVencimiento;
};

/**
 * Obtiene ventas de un tenant con paginación, búsqueda y filtros (SERVER-SIDE)
 */
export const findVentasPaginadas = async (
  tenantId: number,
  params: {
    skip: number;
    take: number;
    search?: string;
    cliente_id?: number;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  const { skip, take, search, cliente_id, fecha_inicio, fecha_fin } = params;

  // Construir condición de búsqueda
  const whereClause: Prisma.VentasWhereInput = {
    tenant_id: tenantId,
    ...(cliente_id && { cliente_id }),
    ...(fecha_inicio && { created_at: { gte: fecha_inicio } }),
    ...(fecha_fin && { created_at: { lte: fecha_fin } }),
    ...(search && {
      OR: [
        { cliente: { nombre: { contains: search } } },
        { metodo_pago: { contains: search } },
      ],
    }),
  };

  // Ejecutar dos consultas en transacción
  const [total, data] = await db.$transaction([
    db.ventas.count({ where: whereClause }),
    db.ventas.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            documento_identidad: true,
            direccion: true
          }
        },
        usuario: { select: { id: true, nombre: true, email: true } },
        serie: {
          select: {
            id: true,
            codigo: true,
            tipo_comprobante: true,
            correlativo_actual: true
          }
        },
        VentaDetalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                unidad_medida: {
                  select: {
                    codigo: true,
                    nombre: true
                  }
                }
              }
            }
          }
        }
      },
    }),
  ]);

  return { total, data };
};

/**
 * Obtiene todas las ventas de un tenant con filtros opcionales
 * @deprecated Usar findVentasPaginadas para listas grandes
 */
export const findAllVentasByTenant = async (
  tenantId: number,
  filters?: {
    cliente_id?: number;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  return db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters?.cliente_id && { cliente_id: filters.cliente_id }),
      ...(filters?.fecha_inicio && {
        created_at: { gte: filters.fecha_inicio },
      }),
      ...(filters?.fecha_fin && {
        created_at: { lte: filters.fecha_fin },
      }),
    },
    orderBy: { created_at: 'desc' },
    include: {
      cliente: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });
};

/**
 * Busca una venta por ID validando pertenencia al tenant
 */
export const findVentaByIdAndTenant = async (tenantId: number, id: number) => {
  return db.ventas.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
      serie: { select: { id: true, codigo: true, tipo_comprobante: true } },
      VentaDetalles: {
        include: {
          producto: { select: { id: true, nombre: true, sku: true } },
        },
      },
      pedido_origen: { select: { id: true, estado: true, tipo_recojo: true } },
    },
  });
};

/**
 * Crea una nueva venta con sus detalles (transacción)
 * Valida stock disponible y lo descuenta automáticamente
 * Calcula y guarda snapshot fiscal (IGV) según jerarquía tenant → producto
 * Asigna automáticamente serie y correlativo según tipo de comprobante (FACTURA/BOLETA)
 */
export const createVenta = async (
  data: CreateVentaDTO,
  tenantId: number,
  sesionCajaId: number,
  usuarioId?: number,
  pedidoOrigenId?: number
) => {
  return db.$transaction(async (tx) => {
    // 1. Obtener la caja de la sesión actual y validar estado
    const sesion = await tx.sesionesCaja.findFirst({
      where: { id: sesionCajaId, tenant_id: tenantId },
      select: { caja_id: true, estado: true }
    });

    if (!sesion?.caja_id) {
      const err = new Error('Sesión de caja no tiene una caja asignada');
      (err as any).code = 'SESION_SIN_CAJA';
      throw err;
    }

    // VALIDACIÓN CRÍTICA: No permitir ventas en cajas cerradas
    if (sesion.estado !== 'ABIERTA') {
      const err = new Error('No se pueden registrar ventas en una caja cerrada. Abra una nueva sesión de caja.');
      (err as any).code = 'CAJA_CERRADA';
      throw err;
    }

    // 2. Determinar tipo de comprobante
    // Prioridad: 1) Manual (data.tipo_comprobante), 2) Auto-detección por RUC, 3) Default BOLETA
    let tipoComprobante: 'FACTURA' | 'BOLETA' = data.tipo_comprobante || 'BOLETA';

    if (!data.tipo_comprobante && data.cliente_id) {
      // Auto-detección: Primero revisar campo RUC, luego documento_identidad
      const cliente = await tx.clientes.findFirst({
        where: { id: data.cliente_id, tenant_id: tenantId },
        select: { ruc: true, documento_identidad: true }
      });

      if (cliente?.ruc) {
        // Si tiene RUC → FACTURA
        tipoComprobante = 'FACTURA';
      } else if (cliente?.documento_identidad?.length === 11) {
        // Fallback: Si documento_identidad es de 11 dígitos → FACTURA
        tipoComprobante = 'FACTURA';
      }
    }

    // 2.1. Validar: Si se requiere FACTURA, el cliente DEBE tener RUC
    if (tipoComprobante === 'FACTURA' && data.cliente_id) {
      const cliente = await tx.clientes.findFirst({
        where: { id: data.cliente_id, tenant_id: tenantId },
        select: { ruc: true, documento_identidad: true }
      });

      if (!cliente?.ruc && !cliente?.documento_identidad?.match(/^[0-9]{11}$/)) {
        const err = new Error(
          'Para emitir FACTURA, el cliente debe tener RUC registrado. Use BOLETA para clientes con DNI.'
        );
        (err as any).code = 'FACTURA_REQUIRES_RUC';
        throw err;
      }
    }

    // 3. Obtener serie activa para el tipo de comprobante y la caja específica
    const serie = await tx.series.findFirst({
      where: {
        tenant_id: tenantId,
        tipo_comprobante: tipoComprobante,
        caja_id: sesion.caja_id,  // ✅ FILTRAR POR CAJA
        isActive: true
      },
      orderBy: { id: 'asc' }  // Si hay múltiples, tomar la primera
    });

    if (!serie) {
      const err = new Error(
        `No existe una serie activa para comprobantes tipo ${tipoComprobante} asignada a esta caja. Por favor, configure las series en Administración → Series SUNAT.`
      );
      (err as any).code = 'SERIE_NOT_FOUND';
      throw err;
    }

    // 4. Obtener configuración tributaria del tenant
    const fiscalConfig = await tenantModel.getTenantFiscalConfig(tenantId);

    // 5. Validar stock PRIMERO (antes de incrementar correlativo)
    // Calcular total y preparar detalles con snapshot fiscal
    let total = 0;
    const detallesConIGV: Array<{
      producto_id: number;
      cantidad: number;
      valor_unitario: number;
      precio_unitario: number;
      igv_total: number;
      tasa_igv: number;
    }> = [];

    // Validar stock y calcular IGV para cada detalle
    for (const detalle of data.detalles) {
      const producto = await tx.productos.findFirst({
        where: { id: detalle.producto_id, tenant_id: tenantId },
        select: {
          id: true,
          stock: true,
          nombre: true,
          afectacion_igv: true
        },
      });

      if (!producto) {
        const err = new Error(
          `Producto con ID ${detalle.producto_id} no encontrado en este tenant`
        );
        (err as any).code = 'PRODUCTO_NOT_FOUND';
        throw err;
      }

      if (Number(producto.stock) < Number(detalle.cantidad)) {
        const err = new Error(
          `Stock insuficiente para producto "${producto.nombre}". Disponible: ${producto.stock}, Requerido: ${detalle.cantidad}`
        );
        (err as any).code = 'STOCK_INSUFICIENTE';
        throw err;
      }

      // Calcular tasa de IGV según jerarquía (tenant → producto)
      const tasaIGV = calcularTasaIGV(
        fiscalConfig,
        producto.afectacion_igv as AfectacionIGV
      );

      // Descomponer precio_unitario (con IGV) en valor_base + IGV
      const descomposicion = descomponerPrecioConIGV(
        Number(detalle.precio_unitario),
        tasaIGV
      );

      // IGV total de esta línea = IGV unitario × cantidad
      const igv_linea = descomposicion.igv * Number(detalle.cantidad);

      detallesConIGV.push({
        producto_id: detalle.producto_id,
        cantidad: Number(detalle.cantidad),
        valor_unitario: descomposicion.valor_base,
        precio_unitario: descomposicion.precio_final,
        igv_total: Number(igv_linea.toFixed(2)),
        tasa_igv: tasaIGV,
      });

      // Acumular total
      total += Number(detalle.precio_unitario) * Number(detalle.cantidad);
    }

    // 6. AHORA SÍ: Incrementar correlativo de forma atómica (después de validar todo)
    const nuevoCorrelativo = serie.correlativo_actual + 1;
    await tx.series.update({
      where: { id: serie.id },
      data: { correlativo_actual: nuevoCorrelativo }
    });

    // 7. Crear venta con serie, correlativo y sesión de caja
    const nuevaVenta = await tx.ventas.create({
      data: {
        tenant_id: tenantId,
        total: Number(total.toFixed(2)),
        metodo_pago: data.metodo_pago ?? null,
        cliente_id: data.cliente_id ?? null,
        usuario_id: usuarioId ?? null,
        pedido_origen_id: pedidoOrigenId ?? null,
        sesion_caja_id: sesionCajaId,
        serie_id: serie.id,
        numero_comprobante: nuevoCorrelativo,
        condicion_pago: data.condicion_pago || 'CONTADO',
        estado_pago: data.condicion_pago === 'CREDITO' ? 'PENDIENTE' : 'PAGADO',
        saldo_pendiente: data.condicion_pago === 'CREDITO' ? Number(total.toFixed(2)) : 0,
        monto_pagado: data.condicion_pago === 'CREDITO' ? 0 : Number(total.toFixed(2)),
        fecha_vencimiento: data.condicion_pago === 'CREDITO' && data.cliente_id
          ? await calcularFechaVencimiento(tx, tenantId, data.cliente_id)
          : null,
      },
    });

    // Crear detalles de venta CON snapshot fiscal y descontar stock
    for (const detalle of detallesConIGV) {
      await tx.ventaDetalles.create({
        data: {
          tenant_id: tenantId,
          venta_id: nuevaVenta.id,
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          // Snapshot fiscal (inmutable)
          valor_unitario: detalle.valor_unitario,
          precio_unitario: detalle.precio_unitario,
          igv_total: detalle.igv_total,
          tasa_igv: detalle.tasa_igv,
        },
      });

      // Descontar stock usando servicio centralizado con bloqueo optimista y Kardex
      await inventarioService.registrarMovimiento(tx, {
        tenantId,
        productoId: detalle.producto_id,
        tipo: 'SALIDA_VENTA',
        cantidad: detalle.cantidad,
        costoUnitario: detalle.precio_unitario,
        referenciaTipo: 'VENTA',
        referenciaId: nuevaVenta.id,
        usuarioId: usuarioId,
      });
    }

    // 8. Si es venta a CREDITO, crear Cuenta Por Cobrar
    if (data.condicion_pago === 'CREDITO' && data.cliente_id && nuevaVenta.fecha_vencimiento) {
      const montoTotal = Number(total.toFixed(2));
      const pagoInicial = data.pago_inicial ? Number(data.pago_inicial) : 0;

      // Validar que el pago inicial no exceda el total
      if (pagoInicial > montoTotal) {
        throw Object.assign(
          new Error(`El pago inicial (S/ ${pagoInicial.toFixed(2)}) no puede exceder el total de la venta (S/ ${montoTotal.toFixed(2)})`),
          { code: 'PAGO_INICIAL_EXCEDE_TOTAL' }
        );
      }

      const saldoPendiente = montoTotal - pagoInicial;

      // Crear Cuenta Por Cobrar con el saldo ajustado
      const cuentaPorCobrar = await tx.cuentasPorCobrar.create({
        data: {
          tenant_id: tenantId,
          venta_id: nuevaVenta.id,
          cliente_id: data.cliente_id,
          monto_total: montoTotal,
          monto_pagado: pagoInicial,
          saldo_pendiente: saldoPendiente,
          estado: saldoPendiente === 0 ? 'PAGADA' : 'VIGENTE',
          fecha_emision: new Date(),
          fecha_vencimiento: nuevaVenta.fecha_vencimiento,
        },
      });

      // Si hay pago inicial, registrar en tabla Pagos
      if (pagoInicial > 0) {
        const pago = await tx.pagos.create({
          data: {
            tenant_id: tenantId,
            cuenta_id: cuentaPorCobrar.id,
            usuario_id: usuarioId ?? null,
            monto: pagoInicial,
            metodo_pago: (data.metodo_pago?.toUpperCase() as any) || 'EFECTIVO',
            referencia: 'PAGO_INICIAL',
            notas: 'Pago inicial registrado al momento de la venta',
            fecha_pago: new Date(),
          },
        });

        // Actualizar estado de la venta según el pago inicial
        await tx.ventas.update({
          where: { id: nuevaVenta.id },
          data: {
            estado_pago: saldoPendiente === 0 ? 'PAGADO' : 'PARCIAL',
            saldo_pendiente: saldoPendiente,
            monto_pagado: pagoInicial,
          },
        });

        // [TRAZABILIDAD FINANCIERA] Registrar ingreso automático en caja por pago inicial
        if (sesionCajaId) {
          await tx.movimientosCaja.create({
            data: {
              tenant_id: tenantId,
              sesion_caja_id: sesionCajaId,
              tipo: 'INGRESO',
              monto: pagoInicial,
              descripcion: `Pago inicial por Venta ${serie.codigo}-${nuevoCorrelativo}`,
              referencia_tipo: 'PAGO',
              referencia_id: pago.id.toString(),
            },
          });

          console.log(`💰 [VENTA] Ingreso automático por pago inicial en caja: S/ ${pagoInicial.toFixed(2)}`);
        }

        console.log(`💰 [VENTA] Pago inicial registrado: S/ ${pagoInicial.toFixed(2)}`);
        console.log(`💰 [VENTA] Saldo pendiente: S/ ${saldoPendiente.toFixed(2)}`);
      }
    }

    // 9. Emitir comprobante electrónico (Mock o Nubefact según ENV)
    try {
      const facturador = obtenerFacturador();

      // Obtener datos completos del cliente para facturación
      const clienteData = data.cliente_id
        ? await tx.clientes.findFirst({
          where: { id: data.cliente_id, tenant_id: tenantId },
          select: {
            nombre: true,
            documento_identidad: true,
            ruc: true,
            razon_social: true,
            direccion: true,
            email: true,
          }
        })
        : null;

      // Obtener datos del tenant para facturación
      const tenant = await tx.tenants.findFirst({
        where: { id: tenantId },
        select: {
          nombre_empresa: true,
          configuracion: true,
        }
      });

      const config = tenant?.configuracion as any;

      // Obtener nombres de productos para los items
      const productosMap = new Map();
      for (const det of detallesConIGV) {
        const producto = await tx.productos.findFirst({
          where: { id: det.producto_id, tenant_id: tenantId },
          select: { nombre: true, unidad_medida: { select: { codigo: true } } }
        });
        productosMap.set(det.producto_id, producto);
      }

      // Preparar datos para el facturador (según interfaz DatosComprobante)
      const datosComprobante: DatosComprobante = {
        tipo_documento: tipoComprobante,
        serie: serie.codigo,
        numero: nuevoCorrelativo,
        fecha_emision: new Date(),
        cliente_documento: clienteData?.ruc || clienteData?.documento_identidad || null,
        cliente_nombre: clienteData?.razon_social || clienteData?.nombre || 'CLIENTE GENERICO',
        items: detallesConIGV.map((det) => {
          const producto = productosMap.get(det.producto_id);
          return {
            descripcion: producto?.nombre || `Producto ${det.producto_id}`,
            cantidad: det.cantidad,
            precio_unitario: det.precio_unitario,
            valor_unitario: det.valor_unitario,
            igv_item: det.igv_total,
          };
        }),
        total_gravado: Number(detallesConIGV.reduce((sum, d) => sum + (d.valor_unitario * d.cantidad), 0).toFixed(2)),
        total_igv: Number(detallesConIGV.reduce((sum, d) => sum + d.igv_total, 0).toFixed(2)),
        total: Number(total.toFixed(2)),
      };

      // Emitir comprobante (asíncrono, no bloquea)
      const respuestaFacturacion = await facturador.emitirComprobante(datosComprobante);

      // Actualizar venta con datos de SUNAT
      await tx.ventas.update({
        where: { id: nuevaVenta.id },
        data: {
          estado_sunat: respuestaFacturacion.estado,
          xml_url: respuestaFacturacion.xml_url,
          cdr_url: respuestaFacturacion.cdr_url,
          hash_cpe: respuestaFacturacion.hash_cpe,
          codigo_qr: respuestaFacturacion.codigo_qr,
        },
      });

      console.log(`✅ [VENTA] Comprobante ${serie.codigo}-${nuevoCorrelativo} emitido con estado: ${respuestaFacturacion.estado}`);
    } catch (error) {
      // Si falla la emisión, no revertir la venta pero loguearlo
      console.error('❌ [VENTA] Error al emitir comprobante:', error);

      // Actualizar estado a PENDIENTE para retry manual
      await tx.ventas.update({
        where: { id: nuevaVenta.id },
        data: {
          estado_sunat: 'PENDIENTE',
        },
      });
    }

    // 10. [TRAZABILIDAD FINANCIERA] Registrar movimiento de caja automático para CONTADO
    if (data.condicion_pago === 'CONTADO' && sesionCajaId) {
      await tx.movimientosCaja.create({
        data: {
          tenant_id: tenantId,
          sesion_caja_id: sesionCajaId,
          tipo: 'INGRESO',
          monto: Number(total.toFixed(2)),
          descripcion: `Ingreso por Venta ${serie.codigo}-${nuevoCorrelativo}`,
          referencia_tipo: 'VENTA',
          referencia_id: nuevaVenta.id.toString(),
        },
      });

      console.log(`💰 [VENTA] Ingreso automático registrado en caja: S/ ${total.toFixed(2)}`);
    }

    return nuevaVenta;
  });
};

/**
 * Actualiza una venta existente (uso limitado)
 * Nota: Generalmente las ventas no se editan, solo se consultan
 */
export const updateVentaByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: { metodo_pago?: string }
) => {
  const existing = await db.ventas.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;

  return db.ventas.update({
    where: { id },
    data: {
      metodo_pago: data.metodo_pago ?? existing.metodo_pago,
    },
  });
};

/**
 * Elimina una venta (uso muy limitado, considerar soft delete en producción)
 * RESTRICCIÓN FISCAL: No permite eliminar comprobantes ACEPTADOS por SUNAT
 */
export const deleteVentaByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.ventas.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true, estado_sunat: true, numero_comprobante: true, serie_id: true }
  });
  if (!existing) return null;

  // RESTRICCIÓN FISCAL: No permitir eliminar comprobantes aceptados por SUNAT
  if (existing.estado_sunat === 'ACEPTADO') {
    const err = new Error('No se puede eliminar un comprobante aceptado por SUNAT. Use Nota de Crédito para anulaciones.');
    (err as any).code = 'COMPROBANTE_SUNAT_ACEPTADO';
    throw err;
  }

  // Eliminar en cascada los detalles (configurado en Prisma)
  return db.ventas.delete({ where: { id } });
};
