import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { getKardexCompletoHandler } from '../controllers/reportes.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import { KardexCompletoResponseSchema } from '../dtos/reporte.dto';

const router = Router();

router.use(checkTenant, checkAuth);

// ==================== GET /reportes/kardex/:productoId ====================
// Definir schema específico para el param productoId
const ProductoIdParamSchema = z.object({
  productoId: z.coerce.number().int().positive().openapi({
    description: 'ID del producto',
    example: 1,
  }),
});

registry.registerPath({
  method: 'get',
  path: '/api/reportes/kardex/{productoId}',
  tags: ['Reportes'],
  summary: 'Obtener Kardex completo de un producto',
  description: 'Genera el reporte Kardex completo de un producto, incluyendo todos los movimientos históricos de ventas, compras y ajustes de inventario ordenados cronológicamente.',
  security: [{ bearerAuth: [] }],
  request: {
    params: ProductoIdParamSchema,
  },
  responses: {
    200: {
      description: 'Kardex del producto obtenido exitosamente',
      content: {
        'application/json': {
          schema: KardexCompletoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/kardex/:productoId',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: ProductoIdParamSchema })),
  getKardexCompletoHandler
);

export default router;
