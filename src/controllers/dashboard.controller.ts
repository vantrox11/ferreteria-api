import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as dashboardService from '../services/dashboard.service';

/**
 * GET /api/dashboard/general
 * Dashboard General (Torre de Control / CEO)
 */
export const getDashboardGeneralHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const estadisticas = await dashboardService.generarDashboardGeneral(tenantId);

    res.status(200).json(estadisticas);
  }
);

/**
 * GET /api/dashboard/ventas
 * Dashboard de Ventas (Motor Comercial / Gerente)
 */
export const getDashboardVentasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const fechaInicio = req.query.fecha_inicio as string | undefined;
    const fechaFin = req.query.fecha_fin as string | undefined;

    const estadisticas = await dashboardService.generarDashboardVentas(
      tenantId,
      fechaInicio,
      fechaFin
    );

    res.status(200).json(estadisticas);
  }
);
