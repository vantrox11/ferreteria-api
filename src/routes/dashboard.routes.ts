import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { 
  getDashboardGeneralHandler,
  getDashboardVentasAnalisisHandler,
  getDashboardVentasEstadisticasHandler 
} from '../controllers/dashboard.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  DashboardVentasEstadisticasResponseSchema,
  DashboardQuerySchema,
} from '../dtos/dashboard.dto';
import { DashboardGeneralResponseSchema } from '../dtos/dashboard-general.dto';
import { DashboardVentasAnalisisResponseSchema } from '../dtos/dashboard-ventas.dto';

const router = Router();

// Proteger todas las rutas con autenticación y tenant
router.use(checkTenant, checkAuth);

// ==================== GET /dashboard/general ====================
registry.registerPath({
  method: 'get',
  path: '/api/dashboard/general',
  tags: ['Dashboard'],
  summary: 'Dashboard General (Home / Vista del Dueño)',
  description: 'Retorna KPIs de salud financiera, ventas últimos 30 días, ventas por vendedor, facturas pendientes SUNAT y productos críticos',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Estadísticas del Dashboard General',
      content: {
        'application/json': {
          schema: DashboardGeneralResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get('/general', getDashboardGeneralHandler);

// ==================== GET /dashboard/ventas/analisis ====================
const FechaQuerySchema = z.object({
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
});

registry.registerPath({
  method: 'get',
  path: '/api/dashboard/ventas/analisis',
  tags: ['Dashboard'],
  summary: 'Dashboard de Ventas (Análisis Comercial)',
  description: 'Retorna KPIs de rendimiento, ventas por categoría, métodos de pago, top 10 productos y top 10 clientes',
  security: [{ bearerAuth: [] }],
  request: {
    query: FechaQuerySchema,
  },
  responses: {
    200: {
      description: 'Estadísticas del Dashboard de Ventas',
      content: {
        'application/json': {
          schema: DashboardVentasAnalisisResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/ventas/analisis',
  validateRequest(z.object({ query: FechaQuerySchema })),
  getDashboardVentasAnalisisHandler
);

// ==================== GET /dashboard/ventas/estadisticas ====================
registry.registerPath({
  method: 'get',
  path: '/api/dashboard/ventas/estadisticas',
  tags: ['Dashboard'],
  summary: 'Obtener estadísticas del dashboard de ventas',
  description: 'Retorna KPIs, serie temporal, top productos rentables y rentabilidad por categoría. Permite filtrar por rango de fechas.',
  security: [{ bearerAuth: [] }],
  request: {
    query: DashboardQuerySchema,
  },
  responses: {
    200: {
      description: 'Estadísticas del dashboard de ventas',
      content: {
        'application/json': {
          schema: DashboardVentasEstadisticasResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/ventas/estadisticas',
  validateRequest(z.object({ query: DashboardQuerySchema })),
  getDashboardVentasEstadisticasHandler
);

export default router;

