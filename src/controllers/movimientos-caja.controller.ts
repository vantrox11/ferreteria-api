import { type Response } from 'express';
import movimientoCajaModel from '../models/movimiento-caja.model';
import { type RequestWithAuth } from '../middlewares/auth.middleware';

export async function createMovimientoHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const usuarioId = req.user!.id;
    const movimiento = await movimientoCajaModel.createMovimiento(tenantId, usuarioId, req.body);
    res.status(201).json(movimiento);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMovimientosSesionActivaHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const usuarioId = req.user!.id;
    const movimientos = await movimientoCajaModel.getMovimientosSesionActiva(tenantId, usuarioId);
    res.status(200).json({ data: movimientos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMovimientosBySesionHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const sesionId = Number(req.params.sesionId);
    const movimientos = await movimientoCajaModel.getMovimientosBySesion(sesionId, tenantId);
    res.status(200).json({ data: movimientos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
