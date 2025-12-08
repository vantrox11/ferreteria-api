import { Router } from 'express';
import { z } from 'zod';
import {
  createCajaHandler,
  getCajasHandler,
  getCajaByIdHandler,
  updateCajaHandler,
  deleteCajaHandler,
} from '../controllers/cajas.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  CreateCajaSchema,
  UpdateCajaSchema,
  CajaResponseSchema,
  ListCajasQuerySchema,
} from '../dtos/caja.dto';
import { IdParamSchema, SuccessResponseSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ==================== POST /cajas ====================
registry.registerPath({
  method: 'post',
  path: '/api/cajas',
  tags: ['Cajas'],
  summary: 'Crear una nueva caja registradora',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCajaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Caja creada exitosamente',
      content: {
        'application/json': {
          schema: CajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateCajaSchema })),
  createCajaHandler
);

// ==================== GET /cajas ====================
registry.registerPath({
  method: 'get',
  path: '/api/cajas',
  tags: ['Cajas'],
  summary: 'Obtener todas las cajas registradoras',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListCajasQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de cajas',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CajaResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/',
  // Cualquier usuario autenticado puede ver las cajas (necesario para apertura de sesión)
  validateRequest(z.object({ query: ListCajasQuerySchema })),
  getCajasHandler
);

// ==================== GET /cajas/:id ====================
registry.registerPath({
  method: 'get',
  path: '/api/cajas/{id}',
  tags: ['Cajas'],
  summary: 'Obtener una caja por ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Caja encontrada',
      content: {
        'application/json': {
          schema: CajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/:id',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema })),
  getCajaByIdHandler
);

// ==================== PUT /cajas/:id ====================
registry.registerPath({
  method: 'put',
  path: '/api/cajas/{id}',
  tags: ['Cajas'],
  summary: 'Actualizar una caja registradora',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCajaSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Caja actualizada exitosamente',
      content: {
        'application/json': {
          schema: CajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema, body: UpdateCajaSchema })),
  updateCajaHandler
);

// ==================== DELETE /cajas/:id ====================
registry.registerPath({
  method: 'delete',
  path: '/api/cajas/{id}',
  tags: ['Cajas'],
  summary: 'Desactivar una caja registradora',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Caja desactivada exitosamente',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.delete(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  deleteCajaHandler
);

export default router;
