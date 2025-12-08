import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getMarcasHandler,
  getMarcaByIdHandler,
  createMarcaHandler,
  updateMarcaHandler,
  desactivarMarcaHandler,
} from '../controllers/marcas.controller';
import { registry, commonResponses, PaginationQuerySchema, SuccessResponseSchema } from '../config/openapi-registry';
import { 
  MarcaResponseSchema,
  CreateMarcaSchema,
  UpdateMarcaSchema,
  PaginatedMarcaResponseSchema
} from '../dtos/marca.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/marcas',
  tags: ['Marcas'],
  summary: 'Listar marcas del tenant (Paginado)',
  description: 'Obtiene todas las marcas activas del tenant con paginación estándar. Accesible para empleados (usado en dropdowns).',
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de marcas',
      content: {
        'application/json': {
          schema: PaginatedMarcaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/marcas/{id}',
  tags: ['Marcas'],
  summary: 'Obtener marca por ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de la marca',
      content: {
        'application/json': {
          schema: MarcaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/marcas',
  tags: ['Marcas'],
  summary: 'Crear marca (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMarcaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Marca creada exitosamente',
      content: {
        'application/json': {
          schema: MarcaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/marcas/{id}',
  tags: ['Marcas'],
  summary: 'Actualizar marca (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateMarcaSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Marca actualizada exitosamente',
      content: {
        'application/json': {
          schema: MarcaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/marcas/{id}/desactivar',
  tags: ['Marcas'],
  summary: 'Desactivar marca (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Marca desactivada exitosamente',
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
  validateRequest(z.object({ query: PaginationQuerySchema })),
  getMarcasHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getMarcaByIdHandler
);

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateMarcaSchema })),
  createMarcaHandler
);

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ 
    params: IdParamSchema,
    body: UpdateMarcaSchema 
  })),
  updateMarcaHandler
);

router.patch(
  '/:id/desactivar',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  desactivarMarcaHandler
);

export default router;
