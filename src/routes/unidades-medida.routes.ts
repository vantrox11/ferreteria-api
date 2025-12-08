import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getUnidadesMedidaHandler,
  getUnidadMedidaByIdHandler,
  createUnidadMedidaHandler,
  updateUnidadMedidaHandler,
  deleteUnidadMedidaHandler,
  getCatalogoSUNATHandler
} from '../controllers/unidades-medida.controller';
import { registry, commonResponses, PaginationQuerySchema } from '../config/openapi-registry';
import { 
  UnidadMedidaResponseSchema,
  CreateUnidadMedidaSchema,
  UpdateUnidadMedidaSchema,
  PaginatedUnidadMedidaResponseSchema
} from '../dtos/unidad-medida.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/unidades-medida/catalogo-sunat',
  tags: ['Unidades de Medida'],
  summary: 'Catálogo oficial SUNAT (Público)',
  description: 'Retorna el Catálogo 03 de SUNAT con 32 unidades oficiales. No requiere autenticación. Referencia: Resolución de Superintendencia N° 097-2012/SUNAT.',
  responses: {
    200: {
      description: 'Catálogo completo de unidades SUNAT',
      content: {
        'application/json': {
          schema: z.object({
            total: z.number(),
            normativa: z.string(),
            referencia: z.string(),
            unidades: z.array(z.object({
              codigo: z.string(),
              nombre: z.string(),
              permite_decimales: z.boolean(),
              categoria: z.string(),
            })),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/unidades-medida',
  tags: ['Unidades de Medida'],
  summary: 'Listar unidades del tenant (Paginado)',
  description: 'Obtiene todas las unidades de medida registradas por el tenant con paginación estándar. Accesible para empleados.',
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de unidades de medida',
      content: {
        'application/json': {
          schema: PaginatedUnidadMedidaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/unidades-medida/{id}',
  tags: ['Unidades de Medida'],
  summary: 'Obtener unidad por ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de la unidad de medida',
      content: {
        'application/json': {
          schema: UnidadMedidaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/unidades-medida',
  tags: ['Unidades de Medida'],
  summary: 'Crear unidad de medida (Solo Admin)',
  description: 'Crea una unidad de medida personalizada. El código debe ser válido según catálogo SUNAT.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUnidadMedidaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Unidad creada exitosamente',
      content: {
        'application/json': {
          schema: UnidadMedidaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/unidades-medida/{id}',
  tags: ['Unidades de Medida'],
  summary: 'Actualizar unidad de medida (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateUnidadMedidaSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Unidad actualizada exitosamente',
      content: {
        'application/json': {
          schema: UnidadMedidaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/unidades-medida/{id}',
  tags: ['Unidades de Medida'],
  summary: 'Eliminar unidad de medida (Solo Admin)',
  description: 'Elimina permanentemente una unidad si no tiene productos asociados.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Unidad eliminada exitosamente',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.get('/catalogo-sunat', getCatalogoSUNATHandler);

router.use(checkTenant);
router.use(checkAuth);

router.get(
  '/',
  validateRequest(z.object({ query: PaginationQuerySchema })),
  getUnidadesMedidaHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getUnidadMedidaByIdHandler
);

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateUnidadMedidaSchema })),
  createUnidadMedidaHandler
);

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ 
    params: IdParamSchema,
    body: UpdateUnidadMedidaSchema 
  })),
  updateUnidadMedidaHandler
);

router.delete(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  deleteUnidadMedidaHandler
);

export default router;
