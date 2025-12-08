import { type Response } from 'express';
import cajaModel from '../models/caja.model';
import { type RequestWithAuth } from '../middlewares/auth.middleware';

/**
 * Crear una nueva caja
 * POST /api/cajas
 */
export async function createCajaHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const caja = await cajaModel.createCaja(tenantId, req.body);

    res.status(201).json(caja);
  } catch (error: any) {
    console.error('Error al crear caja:', error);
    
    // Manejar error de unique constraint (nombre duplicado en tenant)
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe una caja con ese nombre en tu empresa',
      });
    }
    
    res.status(500).json({ error: error.message || 'Error al crear la caja' });
  }
}

/**
 * Obtener todas las cajas
 * GET /api/cajas
 */
export async function getCajasHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const includeInactive = req.query.includeInactive === 'true';

    const cajas = await cajaModel.getCajasByTenant(tenantId, includeInactive);

    res.status(200).json({ data: cajas });
  } catch (error: any) {
    console.error('Error al obtener cajas:', error);
    res.status(500).json({ error: error.message || 'Error al obtener las cajas' });
  }
}

/**
 * Obtener una caja por ID
 * GET /api/cajas/:id
 */
export async function getCajaByIdHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const cajaId = Number(req.params.id);
    const caja = await cajaModel.getCajaByIdAndTenant(cajaId, tenantId);

    if (!caja) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    res.status(200).json(caja);
  } catch (error: any) {
    console.error('Error al obtener caja:', error);
    res.status(500).json({ error: error.message || 'Error al obtener la caja' });
  }
}

/**
 * Actualizar una caja
 * PUT /api/cajas/:id
 */
export async function updateCajaHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const cajaId = Number(req.params.id);
    const caja = await cajaModel.updateCajaByIdAndTenant(cajaId, tenantId, req.body);

    if (!caja) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    res.status(200).json(caja);
  } catch (error: any) {
    console.error('Error al actualizar caja:', error);
    
    // Manejar error de unique constraint (nombre duplicado en tenant)
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe una caja con ese nombre en tu empresa',
      });
    }
    
    res.status(500).json({ error: error.message || 'Error al actualizar la caja' });
  }
}

/**
 * Eliminar (desactivar) una caja
 * DELETE /api/cajas/:id
 */
export async function deleteCajaHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const cajaId = Number(req.params.id);
    const deleted = await cajaModel.deleteCajaByIdAndTenant(cajaId, tenantId);

    if (!deleted) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    res.status(200).json({ message: 'Caja desactivada exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar caja:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar la caja' });
  }
}
