import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import { IdParamSchema } from '../dtos/common.dto';
import { CreateVentaSchema, ListVentasQuerySchema, UpdateVentaSchema } from '../dtos/venta.dto';
import * as ventaModel from '../services/ventas.service';
import * as auditService from '../services/audit.service';
import { db } from '../config/db';
import { isAppError, AppError } from '../utils/app-error';

/**
 * GET /api/ventas — Lista todas las ventas del tenant con paginación, búsqueda y filtros
 */
export const getVentasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    // Parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.q as string) || '';

    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * validLimit;

    // Filtros adicionales
    const filters = {
      skip,
      take: validLimit,
      search: search.trim() || undefined,
      cliente_id: req.query.cliente_id ? Number(req.query.cliente_id) : undefined,
      fecha_inicio: req.query.fecha_inicio ? new Date(req.query.fecha_inicio as string) : undefined,
      fecha_fin: req.query.fecha_fin ? new Date(req.query.fecha_fin as string) : undefined,
    };

    const { total, data: ventas } = await ventaModel.findVentasPaginadas(tenantId, filters);

    // Devolver estructura REAL sin campos fantasma
    // Frontend debe usar cuenta_por_cobrar para estado de pago en ventas a crédito
    const result = ventas.map((v) => ({
      id: v.id,
      total: v.total,
      metodo_pago: v.metodo_pago,
      condicion_pago: v.condicion_pago,
      created_at: v.created_at,
      tenant_id: v.tenant_id,
      cliente_id: v.cliente_id,
      cliente: v.cliente,
      usuario_id: v.usuario_id,
      usuario: v.usuario,
      pedido_origen_id: v.pedido_origen_id,
      sesion_caja_id: v.sesion_caja_id,
      serie_id: v.serie_id,
      serie: v.serie,
      numero_comprobante: v.numero_comprobante,
      estado_sunat: v.estado_sunat,
      xml_url: v.xml_url,
      cdr_url: v.cdr_url,
      hash_cpe: v.hash_cpe,
      codigo_qr: v.codigo_qr,
      // Relación real para créditos - frontend usa esto para estado de pago
      cuenta_por_cobrar: v.CuentasPorCobrar ? {
        id: v.CuentasPorCobrar.id,
        estado: v.CuentasPorCobrar.estado,
        saldo_pendiente: Number(v.CuentasPorCobrar.saldo_pendiente),
        monto_pagado: Number(v.CuentasPorCobrar.monto_pagado),
        monto_total: Number(v.CuentasPorCobrar.monto_total),
        fecha_vencimiento: v.CuentasPorCobrar.fecha_vencimiento,
      } : null,
      detalles: v.VentaDetalles.map((d) => ({
        id: d.id,
        producto_id: d.producto_id,
        producto: d.producto,
        cantidad: d.cantidad,
        valor_unitario: d.valor_unitario,
        precio_unitario: d.precio_unitario,
        igv_total: d.igv_total,
        tasa_igv: d.tasa_igv,
        tenant_id: d.tenant_id,
        venta_id: d.venta_id,
      })),
    }));

    res.status(200).json({
      data: result,
      meta: {
        total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  }
);


/**
 * GET /api/ventas/:id — Obtiene el detalle de una venta específica
 */
export const getVentaByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const venta = await ventaModel.findVentaByIdAndTenant(tenantId, id);
    if (!venta) {
      res.status(404).json({ message: 'Venta no encontrada.' });
      return;
    }

    // Mapear detalles según DetalleVentaResponseSchema (incluye todos los campos fiscales)
    const detalles = venta.VentaDetalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      producto: d.producto,
      cantidad: d.cantidad,
      valor_unitario: d.valor_unitario,
      precio_unitario: d.precio_unitario,
      igv_total: d.igv_total,
      tasa_igv: d.tasa_igv,
      tenant_id: d.tenant_id,
      venta_id: d.venta_id,
    }));

    // Devolver estructura REAL - frontend usa cuenta_por_cobrar para estado de pago
    res.status(200).json({
      id: venta.id,
      total: venta.total,
      metodo_pago: venta.metodo_pago,
      condicion_pago: venta.condicion_pago,
      created_at: venta.created_at,
      tenant_id: venta.tenant_id,
      cliente_id: venta.cliente_id,
      cliente: venta.cliente,
      usuario_id: venta.usuario_id,
      usuario: venta.usuario,
      pedido_origen_id: venta.pedido_origen_id,
      sesion_caja_id: venta.sesion_caja_id,
      serie_id: venta.serie_id,
      numero_comprobante: venta.numero_comprobante,
      estado_sunat: venta.estado_sunat,
      xml_url: venta.xml_url,
      cdr_url: venta.cdr_url,
      hash_cpe: venta.hash_cpe,
      codigo_qr: venta.codigo_qr,
      cuenta_por_cobrar: venta.CuentasPorCobrar ? {
        id: venta.CuentasPorCobrar.id,
        estado: venta.CuentasPorCobrar.estado,
        saldo_pendiente: Number(venta.CuentasPorCobrar.saldo_pendiente),
        monto_pagado: Number(venta.CuentasPorCobrar.monto_pagado),
        monto_total: Number(venta.CuentasPorCobrar.monto_total),
        fecha_vencimiento: venta.CuentasPorCobrar.fecha_vencimiento,
      } : null,
      detalles,
    });
  }
);

/**
 * POST /api/ventas — Crea una nueva venta (POS)
 * Valida stock y descuenta automáticamente
 * Requiere sesión de caja activa (validado por middleware requireSesionCajaActiva)
 */
export const createVentaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const usuarioId = req.user?.id;
    const sesionCajaId = (req as any).sesionCajaId; // Proporcionado por middleware requireSesionCajaActiva

    try {
      const nuevaVenta = await ventaModel.createVenta(
        req.body,
        tenantId,
        sesionCajaId,
        usuarioId
      );

      // Obtener la venta completa con todos los campos actualizados (incluyendo estado_sunat)
      const ventaCompleta = await ventaModel.findVentaByIdAndTenant(tenantId, nuevaVenta.id);

      if (usuarioId) {
        const ipAddress = req.ip ?? req.socket.remoteAddress ?? undefined;
        const userAgent = req.get('user-agent') ?? undefined;
        // Registrar auditoría de forma asíncrona sin bloquear la respuesta
        void auditService.auditarCreacion(
          usuarioId,
          tenantId,
          'Ventas',
          nuevaVenta.id,
          {
            total: nuevaVenta.total,
            cliente_id: nuevaVenta.cliente_id,
            sesion_caja_id: nuevaVenta.sesion_caja_id,
            serie_id: nuevaVenta.serie_id,
            numero_comprobante: nuevaVenta.numero_comprobante,
          },
          ipAddress,
          userAgent
        );
      }

      // Devolver estructura REAL con campos SUNAT
      res.status(201).json({
        id: ventaCompleta!.id,
        total: ventaCompleta!.total,
        metodo_pago: ventaCompleta!.metodo_pago,
        condicion_pago: ventaCompleta!.condicion_pago,
        created_at: ventaCompleta!.created_at,
        tenant_id: ventaCompleta!.tenant_id,
        cliente_id: ventaCompleta!.cliente_id,
        cliente: ventaCompleta!.cliente,
        usuario_id: ventaCompleta!.usuario_id,
        usuario: ventaCompleta!.usuario,
        pedido_origen_id: ventaCompleta!.pedido_origen_id,
        sesion_caja_id: ventaCompleta!.sesion_caja_id,
        serie_id: ventaCompleta!.serie_id,
        serie: ventaCompleta!.serie,
        numero_comprobante: ventaCompleta!.numero_comprobante,
        estado_sunat: ventaCompleta!.estado_sunat,
        xml_url: ventaCompleta!.xml_url,
        cdr_url: ventaCompleta!.cdr_url,
        hash_cpe: ventaCompleta!.hash_cpe,
        codigo_qr: ventaCompleta!.codigo_qr,
        cuenta_por_cobrar: ventaCompleta!.CuentasPorCobrar ? {
          id: ventaCompleta!.CuentasPorCobrar.id,
          estado: ventaCompleta!.CuentasPorCobrar.estado,
          saldo_pendiente: Number(ventaCompleta!.CuentasPorCobrar.saldo_pendiente),
          monto_pagado: Number(ventaCompleta!.CuentasPorCobrar.monto_pagado),
          monto_total: Number(ventaCompleta!.CuentasPorCobrar.monto_total),
          fecha_vencimiento: ventaCompleta!.CuentasPorCobrar.fecha_vencimiento,
        } : null,
        detalles: ventaCompleta!.VentaDetalles.map((d) => ({
          id: d.id,
          producto_id: d.producto_id,
          producto: d.producto,
          cantidad: d.cantidad,
          valor_unitario: d.valor_unitario,
          precio_unitario: d.precio_unitario,
          igv_total: d.igv_total,
          tasa_igv: d.tasa_igv,
          tenant_id: d.tenant_id,
          venta_id: d.venta_id,
        })),
      });
    } catch (error: unknown) {
      console.error('❌ Error al crear venta:', error);

      // Usar sistema de errores tipados
      if (isAppError(error)) {
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        res.status(error.statusCode).json(error.toJSON());
        return;
      }

      console.error('Error no tipado:', error);
      console.error('Body recibido:', JSON.stringify(req.body, null, 2));
      res.status(500).json({ message: 'Error al crear venta.' });
    }
  }
);

/**
 * PUT /api/ventas/:id — Actualiza método de pago de una venta
 * Nota: Uso limitado, generalmente las ventas no se editan
 */
export const updateVentaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const updated = await ventaModel.updateVentaByIdAndTenant(
      tenantId,
      id,
      req.body
    );
    if (!updated) {
      res.status(404).json({ message: 'Venta no encontrada.' });
      return;
    }

    // Devolver objeto completo según VentaResponseSchema
    res.status(200).json(updated);
  }
);

/**
 * DELETE /api/ventas/:id — Elimina una venta
 * Nota: Uso muy limitado, considerar soft delete en producción
 */
export const deleteVentaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    try {
      const deleted = await ventaModel.deleteVentaByIdAndTenant(tenantId, id);
      if (!deleted) {
        res.status(404).json({ message: 'Venta no encontrada.' });
        return;
      }

      res.status(200).json({ message: 'Venta eliminada exitosamente.' });
    } catch (error: unknown) {
      if (isAppError(error)) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }
      res.status(500).json({ message: 'Error al eliminar venta.' });
    }
  }
);

/**
 * GET /api/ventas/:id/saldo-nc — Consulta saldo disponible para emitir Nota de Crédito
 * 
 * Calcula:
 * - Total de la venta original
 * - Total devuelto (suma de NCs ACEPTADAS + PENDIENTES)
 * - Saldo disponible
 * - Si se puede emitir nueva NC
 */
export const getSaldoNCHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const ventaId = Number(req.params.id);

    // 1. Verificar que la venta exista
    const venta = await db.ventas.findFirst({
      where: {
        id: ventaId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        total: true,
        estado_sunat: true,
      },
    });

    if (!venta) {
      res.status(404).json({ message: 'Venta no encontrada.' });
      return;
    }

    // 2. Validar estado SUNAT
    if (venta.estado_sunat !== 'ACEPTADO') {
      res.status(200).json({
        saldo_disponible: 0,
        total_venta: Number(venta.total),
        total_devuelto: 0,
        puede_emitir_nc: false,
        razon_bloqueo: 'Solo se pueden emitir Notas de Crédito para comprobantes ACEPTADOS por SUNAT',
      });
      return;
    }

    // 3. Calcular total devuelto (NCs ACEPTADAS + PENDIENTES)
    const notasCredito = await db.notasCredito.findMany({
      where: {
        venta_referencia_id: ventaId,
        tenant_id: tenantId,
        estado_sunat: {
          in: ['ACEPTADO', 'PENDIENTE'],
        },
      },
      select: {
        monto_total: true,
      },
    });

    const totalDevuelto = notasCredito.reduce((sum, nc) => sum + Number(nc.monto_total), 0);
    const saldoDisponible = Number(venta.total) - totalDevuelto;

    // 4. Determinar si se puede emitir NC
    let puedeEmitirNC = true;
    let razonBloqueo: string | null = null;

    if (saldoDisponible <= 0) {
      puedeEmitirNC = false;
      razonBloqueo = 'Venta totalmente anulada. No hay saldo disponible para más Notas de Crédito.';
    }

    res.status(200).json({
      saldo_disponible: Number(saldoDisponible.toFixed(2)),
      total_venta: Number(venta.total),
      total_devuelto: Number(totalDevuelto.toFixed(2)),
      puede_emitir_nc: puedeEmitirNC,
      razon_bloqueo: razonBloqueo,
    });
  }
);
