import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as dashboardService from '../services/dashboard.service';
import type { DashboardQueryDTO } from '../dtos/dashboard.dto';

/**
 * GET /api/dashboard/general
 * Obtiene estadísticas del Dashboard General (Home)
 */
export const getDashboardGeneralHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const estadisticas = await dashboardService.generarDashboardGeneral(tenantId);

    res.status(200).json(estadisticas);
  }
);

/**
 * GET /api/dashboard/ventas/analisis
 * Obtiene estadísticas del Dashboard de Ventas (Análisis Comercial)
 */
export const getDashboardVentasAnalisisHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const fechaInicio = req.query.fecha_inicio as string | undefined;
    const fechaFin = req.query.fecha_fin as string | undefined;

    const estadisticas = await dashboardService.generarDashboardVentasAnalisis(
      tenantId,
      fechaInicio,
      fechaFin
    );

    res.status(200).json(estadisticas);
  }
);

/**
 * GET /api/dashboard/ventas/estadisticas
 * Obtiene estadísticas completas del dashboard de ventas
 */
export const getDashboardVentasEstadisticasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const params: DashboardQueryDTO = {
      fecha_inicio: req.query.fecha_inicio as string | undefined,
      fecha_fin: req.query.fecha_fin as string | undefined,
      canal: (req.query.canal as 'fisica' | 'web' | 'ambos') || 'ambos',
    };

    const estadisticas = await dashboardService.generarEstadisticasDashboardVentas(
      tenantId,
      params
    );

    res.status(200).json(estadisticas);
  }
);

