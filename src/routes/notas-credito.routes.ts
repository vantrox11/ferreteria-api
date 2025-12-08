/**
 * RUTAS DE NOTAS DE CRÉDITO
 */

import { Router } from 'express';
import { z } from 'zod';
import * as notasCreditoController from '../controllers/notas-credito.controller';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { registry, commonResponses } from '../config/openapi-registry';
import { 
  CreateNotaCreditoSchema, 
  ListNotasCreditoQuerySchema,
  NotaCreditoResponseSchema,
  PaginatedNotaCreditoResponseSchema,
} from '../dtos/nota-credito.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

/**
 * POST /api/notas-credito - Crear Nota de Crédito
 */
registry.registerPath({
  method: 'post',
  path: '/api/notas-credito',
  tags: ['NotasCredito'],
  summary: 'Crear Nota de Crédito',
  description: 'Emite una NC con devolución automática de stock y ajuste de deuda según tipo.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateNotaCreditoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'NC creada exitosamente',
      content: {
        'application/json': {
          schema: NotaCreditoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/notas-credito - Listar Notas de Crédito
 */
registry.registerPath({
  method: 'get',
  path: '/api/notas-credito',
  tags: ['NotasCredito'],
  summary: 'Listar Notas de Crédito',
  description: 'Lista NCs con paginación y filtros por venta, estado SUNAT, tipo, fechas.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListNotasCreditoQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de NCs',
      content: {
        'application/json': {
          schema: PaginatedNotaCreditoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/notas-credito/:id - Obtener detalle de NC
 */
registry.registerPath({
  method: 'get',
  path: '/api/notas-credito/{id}',
  tags: ['NotasCredito'],
  summary: 'Obtener detalle de NC',
  description: 'Obtiene una NC específica con todos sus detalles y relaciones.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de NC',
      content: {
        'application/json': {
          schema: NotaCreditoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * POST /api/notas-credito/:id/reenviar - Reenviar NC a SUNAT
 */
registry.registerPath({
  method: 'post',
  path: '/api/notas-credito/{id}/reenviar',
  tags: ['NotasCredito'],
  summary: 'Reenviar NC a SUNAT',
  description: 'Reintenta envío de NC rechazada o pendiente.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'NC reenviada exitosamente',
      content: {
        'application/json': {
          schema: NotaCreditoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.post(
  '/',
  validateRequest(z.object({ body: CreateNotaCreditoSchema })),
  notasCreditoController.createNotaCredito
);

router.get(
  '/',
  validateRequest(z.object({ query: ListNotasCreditoQuerySchema })),
  notasCreditoController.listNotasCredito
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  notasCreditoController.getNotaCreditoById
);

router.post(
  '/:id/reenviar',
  validateRequest(z.object({ params: IdParamSchema })),
  notasCreditoController.reenviarNotaCredito
);

export default router;
