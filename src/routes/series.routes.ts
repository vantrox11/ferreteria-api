import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createSerieHandler,
  getSeriesHandler,
  getSerieByIdHandler,
  updateSerieHandler,
  deleteSerieHandler,
} from '../controllers/series.controller';
import { registry, commonResponses, SuccessResponseSchema } from '../config/openapi-registry';
import {
  SerieResponseSchema,
  CreateSerieSchema,
  UpdateSerieSchema,
  ListSeriesQuerySchema,
} from '../dtos/serie.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/series',
  tags: ['Series SUNAT'],
  summary: 'Listar series del tenant (con filtros)',
  description: 'Obtiene todas las series de comprobantes SUNAT (F001, B001, NV01) del tenant. Permite filtrar por tipo de comprobante e incluir inactivas.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListSeriesQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de series',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(SerieResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/series/{id}',
  tags: ['Series SUNAT'],
  summary: 'Obtener serie por ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de la serie',
      content: {
        'application/json': {
          schema: SerieResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/series',
  tags: ['Series SUNAT'],
  summary: 'Crear serie (Solo Admin)',
  description: 'Crea una nueva serie de comprobante. El código debe tener 4 caracteres (ej: F001, B001).',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSerieSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Serie creada exitosamente',
      content: {
        'application/json': {
          schema: SerieResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/series/{id}',
  tags: ['Series SUNAT'],
  summary: 'Actualizar serie (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateSerieSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Serie actualizada exitosamente',
      content: {
        'application/json': {
          schema: SerieResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/series/{id}',
  tags: ['Series SUNAT'],
  summary: 'Eliminar serie (Solo Admin)',
  description: 'Elimina permanentemente una serie si no tiene comprobantes asociados.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Serie eliminada exitosamente',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.get(
  '/',
  validateRequest(z.object({ query: ListSeriesQuerySchema })),
  getSeriesHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getSerieByIdHandler
);

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateSerieSchema })),
  createSerieHandler
);

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({
    params: IdParamSchema,
    body: UpdateSerieSchema,
  })),
  updateSerieHandler
);

router.delete(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  deleteSerieHandler
);

export default router;
