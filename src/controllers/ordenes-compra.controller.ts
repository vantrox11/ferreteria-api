import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as ordenCompraModel from '../models/orden-compra.model';
import { EstadoOrdenCompra } from '@prisma/client';

/**
 * GET /api/compras — Lista todas las órdenes de compra del tenant (con filtros opcionales)
 */
export const getOrdenesCompraHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const filters = {
      proveedor_id: req.query.proveedor_id ? Number(req.query.proveedor_id) : undefined,
      estado: req.query.estado as EstadoOrdenCompra | undefined,
      fecha_inicio: req.query.fecha_inicio ? new Date(req.query.fecha_inicio as string) : undefined,
      fecha_fin: req.query.fecha_fin ? new Date(req.query.fecha_fin as string) : undefined,
    };

    const ordenes = await ordenCompraModel.findAllOrdenesCompraByTenant(tenantId, filters);

    const result = ordenes.map((o) => ({
      id: o.id,
      total: o.total,
      subtotal_base: o.subtotal_base,
      impuesto_igv: o.impuesto_igv,
      tipo_comprobante: o.tipo_comprobante,
      serie: o.serie,
      numero: o.numero,
      fecha_emision: o.fecha_emision,
      estado: o.estado,
      fecha_creacion: o.fecha_creacion,
      fecha_recepcion: o.fecha_recepcion,
      proveedor: o.proveedor
        ? {
            id: o.proveedor.id,
            nombre: o.proveedor.nombre,
            ruc_identidad: o.proveedor.ruc_identidad,
          }
        : null,
      usuario: o.usuario ? { id: o.usuario.id, nombre: o.usuario.nombre } : null,
    }));

    res.status(200).json({ data: result });
  }
);

/**
 * GET /api/compras/:id — Obtiene el detalle de una orden de compra específica
 */
export const getOrdenCompraByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const orden = await ordenCompraModel.findOrdenCompraByIdAndTenant(tenantId, id);
    if (!orden) {
      res.status(404).json({ message: 'Orden de compra no encontrada.' });
      return;
    }

    const detalles = orden.OrdenCompraDetalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      producto_nombre: d.producto?.nombre ?? null,
      producto_sku: d.producto?.sku ?? null,
      stock_actual: d.producto?.stock ?? 0,
      cantidad: d.cantidad,
      costo_unitario: d.costo_unitario,
      subtotal: Number(d.costo_unitario) * Number(d.cantidad),
    }));

    res.status(200).json({
      id: orden.id,
      total: orden.total,
      subtotal_base: orden.subtotal_base,
      impuesto_igv: orden.impuesto_igv,
      tipo_comprobante: orden.tipo_comprobante,
      serie: orden.serie,
      numero: orden.numero,
      fecha_emision: orden.fecha_emision,
      estado: orden.estado,
      fecha_creacion: orden.fecha_creacion,
      fecha_recepcion: orden.fecha_recepcion,
      proveedor: orden.proveedor
        ? {
            id: orden.proveedor.id,
            nombre: orden.proveedor.nombre,
            ruc_identidad: orden.proveedor.ruc_identidad,
            email: orden.proveedor.email,
            telefono: orden.proveedor.telefono,
          }
        : null,
      usuario: orden.usuario
        ? { id: orden.usuario.id, nombre: orden.usuario.nombre }
        : null,
      detalles,
    });
  }
);

/**
 * POST /api/compras — Crea una nueva orden de compra
 */
export const createOrdenCompraHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const usuarioId = req.user?.id;

    try {
      const nuevaOrden = await ordenCompraModel.createOrdenCompra(req.body, tenantId, usuarioId);
      res.status(201).json({
        id: nuevaOrden.id,
        total: nuevaOrden.total,
        estado: nuevaOrden.estado,
        fecha_creacion: nuevaOrden.fecha_creacion,
      });
    } catch (error: any) {
      if (error?.code === 'PRODUCTO_NOT_FOUND') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error?.code === 'PROVEEDOR_NOT_FOUND') {
        res.status(404).json({ message: error.message });
        return;
      }
      console.error('Error al crear orden de compra:', error);
      console.error('Body recibido:', JSON.stringify(req.body, null, 2));
      res.status(500).json({ 
        message: 'Error al crear orden de compra.',
        error: error.message 
      });
    }
  }
);

/**
 * PUT /api/compras/:id — Actualiza una orden de compra existente
 */
export const updateOrdenCompraHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    try {
      const updated = await ordenCompraModel.updateOrdenCompraByIdAndTenant(
        tenantId,
        id,
        req.body
      );
      if (!updated) {
        res.status(404).json({ message: 'Orden de compra no encontrada.' });
        return;
      }

      res.status(200).json({
        id: updated.id,
        total: updated.total,
        estado: updated.estado,
        fecha_creacion: updated.fecha_creacion,
        fecha_recepcion: updated.fecha_recepcion,
      });
    } catch (error: any) {
      if (error?.code === 'PROVEEDOR_NOT_FOUND') {
        res.status(404).json({ message: error.message });
        return;
      }
      console.error('Error al actualizar orden de compra:', error);
      res.status(500).json({ message: 'Error al actualizar orden de compra.' });
    }
  }
);

/**
 * POST /api/compras/:id/recibir — Registra la recepción de mercadería (actualiza stock)
 * FASE 2.4: Actualizado para usar RecibirOrdenCompraDTO con validación de serie/número
 */
export const recibirOrdenCompraHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    try {
      const ordenRecibida = await ordenCompraModel.recibirOrdenCompra(
        tenantId,
        id,
        req.body // Ahora usa RecibirOrdenCompraDTO (serie, numero, fecha_recepcion)
      );

      res.status(200).json({
        id: ordenRecibida.id,
        estado: ordenRecibida.estado,
        serie: ordenRecibida.serie,
        numero: ordenRecibida.numero,
        fecha_recepcion: ordenRecibida.fecha_recepcion,
        message: 'Orden recibida exitosamente. El stock de los productos ha sido actualizado.',
      });
    } catch (error: any) {
      if (error?.code === 'ORDEN_NOT_FOUND') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error?.code === 'ESTADO_INVALIDO') {
        res.status(409).json({ message: error.message });
        return;
      }
      if (error?.code === 'COMPROBANTE_DUPLICADO') {
        res.status(409).json({ message: error.message });
        return;
      }
      if (error?.code === 'SERIE_INVALIDA' || error?.code === 'NUMERO_INVALIDO') {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error('Error al recibir orden de compra:', error);
      res.status(500).json({ message: 'Error al recibir orden de compra.' });
    }
  }
);

/**
 * POST /api/compras/:id/cancelar — Cancela una orden de compra
 */
export const cancelarOrdenCompraHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    try {
      const ordenCancelada = await ordenCompraModel.cancelarOrdenCompra(
        tenantId,
        id
      );

      if (!ordenCancelada) {
        res.status(404).json({ message: 'Orden de compra no encontrada.' });
        return;
      }

      res.status(200).json({
        id: ordenCancelada.id,
        estado: ordenCancelada.estado,
        message: 'Orden cancelada exitosamente.',
      });
    } catch (error: any) {
      if (error?.code === 'ORDEN_YA_RECIBIDA') {
        res.status(409).json({ message: error.message });
        return;
      }
      console.error('Error al cancelar orden de compra:', error);
      res.status(500).json({ message: 'Error al cancelar orden de compra.' });
    }
  }
);

/**
 * DELETE /api/compras/:id — Elimina una orden de compra
 */
export const deleteOrdenCompraHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    try {
      const deleted = await ordenCompraModel.deleteOrdenCompraByIdAndTenant(
        tenantId,
        id
      );
      if (!deleted) {
        res.status(404).json({ message: 'Orden de compra no encontrada.' });
        return;
      }

      res.status(200).json({ message: 'Orden de compra eliminada exitosamente.' });
    } catch (error: any) {
      if (error?.code === 'ORDEN_YA_RECIBIDA') {
        res.status(409).json({ message: error.message });
        return;
      }
      console.error('Error al eliminar orden de compra:', error);
      res.status(500).json({ message: 'Error al eliminar orden de compra.' });
    }
  }
);
