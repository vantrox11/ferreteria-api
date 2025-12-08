import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getCategoriasHandler,
  createCategoriaHandler,
  getCategoriaByIdHandler,
  updateCategoriaHandler,
  desactivarCategoriaHandler,
} from '../controllers/categorias.controller';
import { registry, commonResponses, PaginationQuerySchema, SuccessResponseSchema } from '../config/openapi-registry';
import { 
  CategoriaResponseSchema,
  CreateCategoriaSchema,
  UpdateCategoriaSchema,
  PaginatedCategoriaResponseSchema
} from '../dtos/categoria.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/categorias',
  tags: ['Categorías'],
  summary: 'Listar categorías del tenant (Paginado)',
  description: 'Obtiene todas las categorías activas del tenant con paginación estándar.',
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de categorías',
      content: {
        'application/json': {
          schema: PaginatedCategoriaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/categorias/{id}',
  tags: ['Categorías'],
  summary: 'Obtener categoría por ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de la categoría',
      content: {
        'application/json': {
          schema: CategoriaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/categorias',
  tags: ['Categorías'],
  summary: 'Crear categoría (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategoriaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Categoría creada exitosamente',
      content: {
        'application/json': {
          schema: CategoriaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/categorias/{id}',
  tags: ['Categorías'],
  summary: 'Actualizar categoría (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCategoriaSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Categoría actualizada exitosamente',
      content: {
        'application/json': {
          schema: CategoriaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/categorias/{id}/desactivar',
  tags: ['Categorías'],
  summary: 'Desactivar categoría (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Categoría desactivada exitosamente',
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
  getCategoriasHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getCategoriaByIdHandler
);

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateCategoriaSchema })),
  createCategoriaHandler
);

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ 
    params: IdParamSchema,
    body: UpdateCategoriaSchema 
  })),
  updateCategoriaHandler
);

router.patch(
  '/:id/desactivar',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  desactivarCategoriaHandler
);

export default router;