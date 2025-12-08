import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as pedidosModel from '../models/pedidos.model';
import * as tenantModel from '../models/tenant.model';
import { EstadoPedido } from '@prisma/client';

/**
 * GET /api/pedidos — Lista pedidos por tenant (opcional filtrar por estado)
 */
export const getPedidosHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const estado = req.query.estado as EstadoPedido | undefined;
    const pedidos = await pedidosModel.findAllPedidosByTenant(tenantId, estado);

    // Configuración del tenant para alertas por vencer
    const tenant = await tenantModel.findTenantById(tenantId);
    const diasLimite =
      (tenant?.configuracion as any)?.pedidos?.dias_limite_reserva ?? 3;

    const result = pedidos.map((p) => {
      const diasTranscurridos = Math.floor(
        (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const alerta_por_vencer = p.estado === 'pendiente' && diasTranscurridos >= diasLimite;
      return {
        id: p.id,
        estado: p.estado,
        tipo_recojo: p.tipo_recojo,
        created_at: p.created_at,
        cliente: p.cliente ? { id: p.cliente.id, nombre: p.cliente.nombre } : null,
        alerta_por_vencer,
      };
    });

    res.status(200).json({ data: result });
  }
);

/**
 * GET /api/pedidos/:id — Detalle del pedido con stock actual
 */
export const getPedidoByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const pedido = await pedidosModel.findPedidoByIdAndTenantWithDetalles(
      tenantId,
      id
    );
    if (!pedido) {
      res.status(404).json({ message: 'Pedido no encontrado.' });
      return;
    }

    const detalles = pedido.detalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      stock_actual: d.producto?.stock ?? 0,
      producto_nombre: d.producto?.nombre ?? null,
    }));

    res.status(200).json({
      id: pedido.id,
      estado: pedido.estado,
      tipo_recojo: pedido.tipo_recojo,
      created_at: pedido.created_at,
      cliente: pedido.cliente ? { id: pedido.cliente.id, nombre: pedido.cliente.nombre } : null,
      detalles,
    });
  }
);

/**
 * POST /api/pedidos/:id/confirmar — Cambia estado a confirmado
 */
export const confirmarPedidoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const pedido = await pedidosModel.findPedidoByIdAndTenantWithDetalles(
      tenantId,
      id
    );
    if (!pedido) {
      res.status(404).json({ message: 'Pedido no encontrado.' });
      return;
    }
    if (pedido.estado !== 'pendiente') {
      res.status(409).json({ message: 'Solo pedidos pendientes pueden confirmarse.' });
      return;
    }

    const updated = await pedidosModel.updatePedidoEstadoByIdAndTenant(
      tenantId,
      id,
      'confirmado',
      req.user?.id
    );
    res.status(200).json({
      id: updated!.id,
      estado: updated!.estado,
      mensaje: req.body.mensaje ?? null,
    });
  }
);

/**
 * POST /api/pedidos/:id/cancelar — Cambia estado a cancelado
 */
export const cancelarPedidoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const pedido = await pedidosModel.findPedidoByIdAndTenantWithDetalles(
      tenantId,
      id
    );
    if (!pedido) {
      res.status(404).json({ message: 'Pedido no encontrado.' });
      return;
    }
    if (pedido.estado !== 'pendiente' && pedido.estado !== 'confirmado') {
      res.status(409).json({ message: 'Solo pedidos pendientes o confirmados pueden cancelarse.' });
      return;
    }

    const updated = await pedidosModel.updatePedidoEstadoByIdAndTenant(
      tenantId,
      id,
      'cancelado',
      req.user?.id
    );
    res.status(200).json({
      id: updated!.id,
      estado: updated!.estado,
      razon: req.body.razon,
    });
  }
);

/**
 * POST /api/pedidos/:id/generar-venta — Crea venta POS desde pedido confirmado
 */
export const generarVentaDesdePedidoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const pedido = await pedidosModel.findPedidoByIdAndTenantWithDetalles(
      tenantId,
      id
    );
    if (!pedido) {
      res.status(404).json({ message: 'Pedido no encontrado.' });
      return;
    }
    if (pedido.estado !== 'confirmado') {
      res.status(409).json({ message: 'El pedido debe estar confirmado para generar venta.' });
      return;
    }

    try {
      const venta = await pedidosModel.generarVentaDesdePedido(
        tenantId,
        id,
        req.user?.id,
        req.body.metodo_pago
      );
      if (!venta) {
        res.status(404).json({ message: 'Pedido no encontrado.' });
        return;
      }
      res.status(201).json({
        id: venta.id,
        total: Number(venta.total),
        metodo_pago: venta.metodo_pago,
        created_at: venta.created_at,
        pedido_origen_id: venta.pedido_origen_id,
      });
    } catch (error: any) {
      if (error?.code === 'VENTA_EXISTENTE') {
        res.status(409).json({ message: 'Este pedido ya tiene una venta generada.' });
        return;
      }
      res.status(500).json({ message: 'Error al generar venta.' });
    }
  }
);