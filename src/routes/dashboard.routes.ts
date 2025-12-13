import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getDashboardGeneralHandler,
  getDashboardVentasHandler,
} from '../controllers/dashboard.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  DashboardGeneralResponseSchema,
  DashboardVentasResponseSchema,
  DashboardQuerySchema,
} from '../dtos/dashboard.dto';

const router = Router();

// Proteger todas las rutas con autenticación y tenant
router.use(checkTenant, checkAuth);

// ==================== GET /dashboard/general ====================
registry.registerPath({
  method: 'get',
  path: '/api/dashboard/general',
  tags: ['Dashboard'],
  summary: 'Dashboard General (Torre de Control / CEO)',
  description: `
    Retorna los signos vitales del negocio:
    - Liquidez desglosada (efectivo en cajas/disponible total)
    - Utilidad bruta real con comparación vs período anterior
    - Cuentas por cobrar vencidas
    - Valor del inventario
    - Gráfico de flujo de caja (30 días)
    - Ticket promedio (30 días)
    - Alertas de quiebre inminente de stock
    - Top 5 deudores
    - Porcentaje de ventas a crédito
  `,
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

// ==================== GET /dashboard/ventas ====================
registry.registerPath({
  method: 'get',
  path: '/api/dashboard/ventas',
  tags: ['Dashboard'],
  summary: 'Dashboard de Ventas (Motor Comercial / Gerente)',
  description: `
    Retorna análisis comercial completo:
    - Ventas totales netas con comparación
    - Margen promedio ponderado
    - Tasa de recurrencia (fidelización)
    - Tasa de devoluciones
    - Top 10 productos por rotación (unidades)
    - Top 10 productos por rentabilidad (utilidad)
    - Ranking de vendedores por utilidad generada
    - Mapa de calor horario
    - Distribución efectivo vs crédito
  `,
  security: [{ bearerAuth: [] }],
  request: {
    query: DashboardQuerySchema,
  },
  responses: {
    200: {
      description: 'Estadísticas del Dashboard de Ventas',
      content: {
        'application/json': {
          schema: DashboardVentasResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/ventas',
  validateRequest(z.object({ query: DashboardQuerySchema })),
  getDashboardVentasHandler
);

export default router;
