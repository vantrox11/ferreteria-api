import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import { IdParamSchema } from '../dtos/common.dto';
import { CreatePagoSchema } from '../dtos/pago.dto';
import * as pagoModel from '../models/pago.model';

/**
 * POST /api/cuentas-por-cobrar/:id/pagos — Registra un pago sobre una CxC
 */
export const createPagoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const usuarioId = req.user?.id!;
    const cuentaId = Number(req.params.id);

    try {
      const pago = await pagoModel.registrarPago(tenantId, cuentaId, req.body, usuarioId);

      res.status(201).json({
        message: 'Pago registrado exitosamente',
        data: {
          id: pago.id,
          monto: Number(pago.monto),
          metodo_pago: pago.metodo_pago,
          referencia: pago.referencia,
          fecha_pago: pago.fecha_pago.toISOString(),
          notas: pago.notas,
          tenant_id: pago.tenant_id,
          cuenta_id: pago.cuenta_id,
          usuario_id: pago.usuario_id,
          usuario: pago.usuario,
        },
      });
    } catch (error: any) {
      if (error?.code === 'CUENTA_NOT_FOUND') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error?.code === 'CUENTA_CANCELADA') {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error?.code === 'MONTO_INVALIDO' || error?.code === 'MONTO_EXCEDE_SALDO') {
        res.status(400).json({ message: error.message });
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /api/cuentas-por-cobrar/:id/pagos — Lista los pagos de una CxC
 */
export const getPagosByCuentaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const cuentaId = Number(req.params.id);

    const pagos = await pagoModel.getPagosByCuenta(tenantId, cuentaId);

    res.status(200).json({
      data: pagos.map((p) => ({
        id: p.id,
        monto: Number(p.monto),
        metodo_pago: p.metodo_pago,
        referencia: p.referencia,
        fecha_pago: p.fecha_pago.toISOString(),
        notas: p.notas,
        tenant_id: p.tenant_id,
        cuenta_id: p.cuenta_id,
        usuario_id: p.usuario_id,
        usuario: p.usuario,
      })),
    });
  }
);

/**
 * GET /api/pagos — Lista todos los pagos del tenant (paginado)
 */
export const getPagosHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * validLimit;

    const filters = {
      skip,
      take: validLimit,
      cuenta_id: req.query.cuenta_id ? Number(req.query.cuenta_id) : undefined,
    };

    const { total, data: pagos } = await pagoModel.getPagosPaginados(tenantId, filters);

    res.status(200).json({
      data: pagos.map((p) => ({
        id: p.id,
        monto: Number(p.monto),
        metodo_pago: p.metodo_pago,
        referencia: p.referencia,
        fecha_pago: p.fecha_pago.toISOString(),
        notas: p.notas,
        tenant_id: p.tenant_id,
        cuenta_id: p.cuenta_id,
        usuario_id: p.usuario_id,
        usuario: p.usuario,
        cuenta_por_cobrar: p.cuenta_por_cobrar,
      })),
      meta: {
        total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  }
);
