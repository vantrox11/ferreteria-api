import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getClientesHandler,
  createClienteHandler,
  getClienteByIdHandler,
  updateClienteHandler,
  desactivarClienteHandler,
} from '../controllers/clientes.controller';
import { registry, commonResponses, PaginationQuerySchema, SuccessResponseSchema } from '../config/openapi-registry';
import {
  ClienteResponseSchema,
  CreateClienteSchema,
  UpdateClienteSchema,
  PaginatedClienteResponseSchema,
} from '../dtos/cliente.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/clientes',
  tags: ['Clientes'],
  summary: 'Listar clientes con paginación',
  description: 'Obtiene todos los clientes activos del tenant con paginación estándar.',
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de clientes',
      content: {
        'application/json': {
          schema: PaginatedClienteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/clientes/{id}',
  tags: ['Clientes'],
  summary: 'Obtener cliente por ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle del cliente',
      content: {
        'application/json': {
          schema: ClienteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/clientes',
  tags: ['Clientes'],
  summary: 'Crear cliente (Admin y Empleado)',
  description: 'Crea un nuevo cliente. DNI debe tener 8 dígitos o RUC 11 dígitos.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateClienteSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Cliente creado exitosamente',
      content: {
        'application/json': {
          schema: ClienteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/clientes/{id}',
  tags: ['Clientes'],
  summary: 'Actualizar cliente (Admin y Empleado)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateClienteSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Cliente actualizado exitosamente',
      content: {
        'application/json': {
          schema: ClienteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/clientes/{id}/desactivar',
  tags: ['Clientes'],
  summary: 'Desactivar cliente (Solo Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Cliente desactivado exitosamente',
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
  getClientesHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getClienteByIdHandler
);

router.post(
  '/',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ body: CreateClienteSchema })),
  createClienteHandler
);

router.put(
  '/:id',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({
    params: IdParamSchema,
    body: UpdateClienteSchema,
  })),
  updateClienteHandler
);

router.patch(
  '/:id/desactivar',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  desactivarClienteHandler
);

export default router;