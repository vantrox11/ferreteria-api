import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as reporteModel from '../models/reporte.model';
// Validación manejada por middleware validateRequest

/**
 * Obtiene el Kardex completo de un producto (Ventas + Compras + Ajustes)
 * GET /api/reportes/kardex/:productoId
 */
export const getKardexCompletoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const productoId = Number(req.params.productoId);

    const kardex = await reporteModel.generarKardexCompleto(tenantId, productoId);
    
    if (!kardex) {
      res.status(404).json({ message: 'Producto no encontrado.' });
      return;
    }

    res.status(200).json(kardex);
  }
);
