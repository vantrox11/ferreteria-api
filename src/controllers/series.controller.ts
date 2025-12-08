import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import serieModel from '../models/serie.model';
import { CreateSerieSchema, UpdateSerieSchema } from '../dtos/serie.dto';
import { type RequestWithAuth } from '../middlewares/auth.middleware';

export const createSerieHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.user!.tenantId;

    try {
      const serie = await serieModel.createSerie(tenantId, req.body);
      res.status(201).json(serie);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'Ya existe una serie con ese código en tu empresa' });
        return;
      }
      throw error;
    }
  }
);

export const getSeriesHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.user!.tenantId;
    const tipoComprobante = req.query.tipo_comprobante as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';
    const series = await serieModel.getSeriesByTenant(tenantId, tipoComprobante, includeInactive);
    res.status(200).json({ data: series });
  }
);

export const getSerieByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.user!.tenantId;
    const serieId = Number(req.params.id);

    const serie = await serieModel.getSerieByIdAndTenant(serieId, tenantId);
    if (!serie) {
      res.status(404).json({ message: 'Serie no encontrada' });
      return;
    }
    res.status(200).json(serie);
  }
);

export const updateSerieHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.user!.tenantId;
    const serieId = Number(req.params.id);

    const serie = await serieModel.updateSerieByIdAndTenant(serieId, tenantId, req.body);
    if (!serie) {
      res.status(404).json({ message: 'Serie no encontrada' });
      return;
    }
    res.status(200).json(serie);
  }
);

export const deleteSerieHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.user!.tenantId;
    const serieId = Number(req.params.id);

    await serieModel.deleteSerieByIdAndTenant(serieId, tenantId);
    res.status(200).json({ message: 'Serie eliminada exitosamente' });
  }
);
