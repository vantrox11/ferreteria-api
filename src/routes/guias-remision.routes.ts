/**
 * RUTAS DE GUÍAS DE REMISIÓN
 */

import { Router } from 'express';
import { z } from 'zod';
import * as guiasRemisionController from '../controllers/guias-remision.controller';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { registry, commonResponses } from '../config/openapi-registry';
import { 
  CreateGuiaRemisionSchema, 
  ListGuiasRemisionQuerySchema,
  GuiaRemisionResponseSchema,
  PaginatedGuiaRemisionResponseSchema,
} from '../dtos/guia-remision.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

/**
 * POST /api/guias-remision - Crear Guía de Remisión
 */
registry.registerPath({
  method: 'post',
  path: '/api/guias-remision',
  tags: ['GuiasRemision'],
  summary: 'Crear Guía de Remisión',
  description: 'Emite una GRE con validación de datos de transporte y envío a SUNAT.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateGuiaRemisionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'GRE creada exitosamente',
      content: {
        'application/json': {
          schema: GuiaRemisionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/guias-remision - Listar Guías de Remisión
 */
registry.registerPath({
  method: 'get',
  path: '/api/guias-remision',
  tags: ['GuiasRemision'],
  summary: 'Listar Guías de Remisión',
  description: 'Lista GREs con paginación y filtros por venta, estado SUNAT, motivo, fechas.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListGuiasRemisionQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de GREs',
      content: {
        'application/json': {
          schema: PaginatedGuiaRemisionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/guias-remision/:id - Obtener detalle de GRE
 */
registry.registerPath({
  method: 'get',
  path: '/api/guias-remision/{id}',
  tags: ['GuiasRemision'],
  summary: 'Obtener detalle de GRE',
  description: 'Obtiene una GRE específica con todos sus detalles y relaciones.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de GRE',
      content: {
        'application/json': {
          schema: GuiaRemisionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.post(
  '/',
  validateRequest(z.object({ body: CreateGuiaRemisionSchema })),
  guiasRemisionController.createGuiaRemision
);

router.get(
  '/',
  validateRequest(z.object({ query: ListGuiasRemisionQuerySchema })),
  guiasRemisionController.listGuiasRemision
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  guiasRemisionController.getGuiaRemisionById
);

export default router;
