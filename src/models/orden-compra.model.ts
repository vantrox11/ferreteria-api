import { db } from '../config/db';
import { EstadoOrdenCompra } from '@prisma/client';
import { type CreateOrdenCompraDTO, type UpdateOrdenCompraDTO, type RecibirOrdenCompraDTO } from '../dtos/orden-compra.dto';
import { IGVCalculator } from '../services/igv-calculator.service';
import { validarProveedorParaFactura, validarFormatoSerie, validarFormatoNumero } from '../utils/validaciones-fiscales';

/**
 * Obtiene todas las órdenes de compra de un tenant con filtros opcionales
 */
export const findAllOrdenesCompraByTenant = async (
  tenantId: number,
  filters?: {
    proveedor_id?: number;
    estado?: EstadoOrdenCompra;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  return db.ordenesCompra.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters?.proveedor_id && { proveedor_id: filters.proveedor_id }),
      ...(filters?.estado && { estado: filters.estado }),
      ...(filters?.fecha_inicio && {
        fecha_creacion: { gte: filters.fecha_inicio },
      }),
      ...(filters?.fecha_fin && {
        fecha_creacion: { lte: filters.fecha_fin },
      }),
    },
    orderBy: { fecha_creacion: 'desc' },
    include: {
      proveedor: { select: { id: true, nombre: true, ruc_identidad: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });
};

/**
 * Busca una orden de compra por ID validando pertenencia al tenant
 */
export const findOrdenCompraByIdAndTenant = async (tenantId: number, id: number) => {
  return db.ordenesCompra.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      proveedor: { select: { id: true, nombre: true, ruc_identidad: true, email: true, telefono: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
      OrdenCompraDetalles: {
        include: {
          producto: { select: { id: true, nombre: true, sku: true, stock: true } },
        },
      },
    },
  });
};

/**
 * Crea una nueva orden de compra con sus detalles (transacción)
 * FASE 2.3: Integra cálculos de IGV y validaciones fiscales
 */
export const createOrdenCompra = async (
  data: CreateOrdenCompraDTO,
  tenantId: number,
  usuarioId?: number
) => {
  return db.$transaction(async (tx) => {
    // Validar que todos los productos pertenezcan al tenant
    for (const detalle of data.detalles) {
      const producto = await tx.productos.findFirst({
        where: { id: detalle.producto_id, tenant_id: tenantId },
        select: { id: true, nombre: true },
      });

      if (!producto) {
        const err = new Error(
          `Producto con ID ${detalle.producto_id} no encontrado en este tenant`
        );
        (err as any).code = 'PRODUCTO_NOT_FOUND';
        throw err;
      }
    }

    // Validar proveedor (ahora es obligatorio)
    const proveedor = await tx.proveedores.findFirst({
      where: { id: data.proveedor_id, tenant_id: tenantId },
      select: { 
        id: true, 
        nombre: true, 
        ruc_identidad: true, 
        tipo_documento: true 
      },
    });

    if (!proveedor) {
      const err = new Error(
        `Proveedor con ID ${data.proveedor_id} no encontrado en este tenant`
      );
      (err as any).code = 'PROVEEDOR_NOT_FOUND';
      throw err;
    }

    // Validar que proveedor tiene RUC si se emite FACTURA
    if (data.tipo_comprobante === 'FACTURA') {
      validarProveedorParaFactura(proveedor);
    }

    // Calcular totales con desglose IGV
    const detallesParaCalculo = data.detalles.map(d => ({
      cantidad: d.cantidad,
      costo_unitario: d.costo_unitario, // Ya viene con IGV incluido
    }));
    
    const totales = IGVCalculator.calcularTotalesOrden(detallesParaCalculo);

    // Crear orden de compra con campos fiscales
    const nuevaOrden = await tx.ordenesCompra.create({
      data: {
        tenant_id: tenantId,
        proveedor_id: data.proveedor_id,
        proveedor_ruc: proveedor.ruc_identidad,
        usuario_id: usuarioId ?? null,
        
        // Campos fiscales
        tipo_comprobante: data.tipo_comprobante ?? null,
        serie: data.serie ?? null,
        numero: data.numero ?? null,
        fecha_emision: data.fecha_emision ? new Date(data.fecha_emision) : null,
        
        // Totales con desglose IGV
        subtotal_base: totales.subtotal_base,
        impuesto_igv: totales.impuesto_igv,
        total: totales.total,
        
        estado: 'pendiente',
      },
    });

    // Crear detalles de orden de compra con desglose IGV
    for (const detalle of data.detalles) {
      const desglose = IGVCalculator.calcularDesgloseCompra(detalle.costo_unitario);
      
      await tx.ordenCompraDetalles.create({
        data: {
          tenant_id: tenantId,
          orden_compra_id: nuevaOrden.id,
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          
          // Costos con desglose IGV
          costo_unitario: detalle.costo_unitario, // Legacy - con IGV
          costo_unitario_total: detalle.costo_unitario, // Con IGV
          costo_unitario_base: desglose.costo_base, // Sin IGV
          tasa_igv: IGVCalculator.TASA_IGV,
          igv_linea: desglose.igv * detalle.cantidad,
        },
      });
    }

    return nuevaOrden;
  });
};

/**
 * Actualiza una orden de compra existente
 */
export const updateOrdenCompraByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: UpdateOrdenCompraDTO
) => {
  const existing = await db.ordenesCompra.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;

  // Validar proveedor si se intenta cambiar
  if (data.proveedor_id) {
    const proveedor = await db.proveedores.findFirst({
      where: { id: data.proveedor_id, tenant_id: tenantId },
      select: { id: true },
    });

    if (!proveedor) {
      const err = new Error(
        `Proveedor con ID ${data.proveedor_id} no encontrado en este tenant`
      );
      (err as any).code = 'PROVEEDOR_NOT_FOUND';
      throw err;
    }
  }

  return db.ordenesCompra.update({
    where: { id },
    data: {
      proveedor_id: data.proveedor_id ?? existing.proveedor_id,
      estado: data.estado ?? existing.estado,
    },
  });
};

/**
 * Registra la recepción de una orden de compra (cambia estado a 'recibida' e incrementa stock)
 * FASE 2.4: Agrega validación de serie/número y prevención de duplicados
 */
export const recibirOrdenCompra = async (
  tenantId: number,
  id: number,
  datosRecepcion: RecibirOrdenCompraDTO
) => {
  return db.$transaction(async (tx) => {
    // Verificar que la orden existe y está pendiente
    const orden = await tx.ordenesCompra.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        proveedor: {
          select: { ruc_identidad: true },
        },
        OrdenCompraDetalles: {
          select: { producto_id: true, cantidad: true },
        },
      },
    });

    if (!orden) {
      const err = new Error('Orden de compra no encontrada');
      (err as any).code = 'ORDEN_NOT_FOUND';
      throw err;
    }

    if (orden.estado !== 'pendiente') {
      const err = new Error(
        `Solo se pueden recibir órdenes con estado "pendiente". Estado actual: ${orden.estado}`
      );
      (err as any).code = 'ESTADO_INVALIDO';
      throw err;
    }

    // Validar formato de serie y número
    validarFormatoSerie(datosRecepcion.serie);
    validarFormatoNumero(datosRecepcion.numero);

    // Verificar que no existe duplicado de comprobante para este proveedor
    const duplicado = await tx.ordenesCompra.findFirst({
      where: {
        tenant_id: tenantId,
        serie: datosRecepcion.serie,
        numero: datosRecepcion.numero,
        proveedor_ruc: orden.proveedor_ruc,
        id: { not: id }, // Excluir la orden actual
      },
    });

    if (duplicado) {
      const err = new Error(
        `Ya existe un comprobante ${datosRecepcion.serie}-${datosRecepcion.numero} registrado para este proveedor (Orden #${duplicado.id})`
      );
      (err as any).code = 'COMPROBANTE_DUPLICADO';
      throw err;
    }

    // Incrementar stock de cada producto
    for (const detalle of orden.OrdenCompraDetalles) {
      await tx.productos.update({
        where: { id: detalle.producto_id },
        data: {
          stock: {
            increment: detalle.cantidad,
          },
        },
      });
    }

    // Actualizar estado de la orden con datos del comprobante
    const ordenActualizada = await tx.ordenesCompra.update({
      where: { id },
      data: {
        estado: 'recibida',
        serie: datosRecepcion.serie,
        numero: datosRecepcion.numero,
        fecha_recepcion: datosRecepcion.fecha_recepcion 
          ? new Date(datosRecepcion.fecha_recepcion) 
          : new Date(),
      },
    });

    return ordenActualizada;
  });
};

/**
 * Cancela una orden de compra (cambia estado a 'cancelada')
 */
export const cancelarOrdenCompra = async (tenantId: number, id: number) => {
  const existing = await db.ordenesCompra.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;

  if (existing.estado === 'recibida') {
    const err = new Error('No se puede cancelar una orden que ya fue recibida');
    (err as any).code = 'ORDEN_YA_RECIBIDA';
    throw err;
  }

  return db.ordenesCompra.update({
    where: { id },
    data: {
      estado: 'cancelada',
    },
  });
};

/**
 * Elimina una orden de compra (uso limitado)
 */
export const deleteOrdenCompraByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.ordenesCompra.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;

  if (existing.estado === 'recibida') {
    const err = new Error('No se puede eliminar una orden que ya fue recibida');
    (err as any).code = 'ORDEN_YA_RECIBIDA';
    throw err;
  }

  // Eliminar en cascada los detalles (configurado en Prisma)
  return db.ordenesCompra.delete({ where: { id } });
};
