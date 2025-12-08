import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getOrdenesCompraHandler,
  getOrdenCompraByIdHandler,
  createOrdenCompraHandler,
  updateOrdenCompraHandler,
  recibirOrdenCompraHandler,
  cancelarOrdenCompraHandler,
  deleteOrdenCompraHandler,
} from '../controllers/ordenes-compra.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  CreateOrdenCompraSchema,
  UpdateOrdenCompraSchema,
  RecibirOrdenCompraSchema,
  OrdenCompraResponseSchema,
  ListOrdenesCompraQuerySchema,
} from '../dtos/orden-compra.dto';
import { IdParamSchema, SuccessResponseSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ==================== GET /compras ====================
registry.registerPath({
  method: 'get',
  path: '/api/compras',
  tags: ['Órdenes de Compra'],
  summary: 'Listar órdenes de compra con filtros',
  description: 'Obtiene todas las órdenes de compra del tenant con filtros opcionales por proveedor, estado y fechas.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListOrdenesCompraQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de órdenes de compra',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(OrdenCompraResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ query: ListOrdenesCompraQuerySchema })),
  getOrdenesCompraHandler
);

// ==================== GET /compras/:id ====================
registry.registerPath({
  method: 'get',
  path: '/api/compras/{id}',
  tags: ['Órdenes de Compra'],
  summary: 'Obtener detalle de orden de compra',
  description: 'Consulta los detalles completos de una orden de compra incluyendo productos y proveedor.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Orden de compra encontrada',
      content: {
        'application/json': {
          schema: OrdenCompraResponseSchema,
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
  getOrdenCompraByIdHandler
);

// ==================== POST /compras ====================
registry.registerPath({
  method: 'post',
  path: '/api/compras',
  tags: ['Órdenes de Compra'],
  summary: 'Crear una nueva orden de compra',
  description: 'Crea una orden de compra con detalles de productos y proveedor opcional.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrdenCompraSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Orden de compra creada exitosamente',
      content: {
        'application/json': {
          schema: OrdenCompraResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateOrdenCompraSchema })),
  createOrdenCompraHandler
);

// ==================== PUT /compras/:id ====================
registry.registerPath({
  method: 'put',
  path: '/api/compras/{id}',
  tags: ['Órdenes de Compra'],
  summary: 'Actualizar una orden de compra',
  description: 'Actualiza proveedor o estado de una orden de compra existente.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateOrdenCompraSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Orden de compra actualizada exitosamente',
      content: {
        'application/json': {
          schema: OrdenCompraResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema, body: UpdateOrdenCompraSchema })),
  updateOrdenCompraHandler
);

// ==================== POST /compras/:id/recibir ====================
registry.registerPath({
  method: 'post',
  path: '/api/compras/{id}/recibir',
  tags: ['Órdenes de Compra'],
  summary: 'Registrar recepción de mercadería',
  description: 'Marca la orden como recibida y actualiza automáticamente el stock de los productos.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: RecibirOrdenCompraSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Orden recibida exitosamente, stock actualizado',
      content: {
        'application/json': {
          schema: OrdenCompraResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/recibir',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema, body: RecibirOrdenCompraSchema })),
  recibirOrdenCompraHandler
);

// ==================== POST /compras/:id/cancelar ====================
registry.registerPath({
  method: 'post',
  path: '/api/compras/{id}/cancelar',
  tags: ['Órdenes de Compra'],
  summary: 'Cancelar una orden de compra',
  description: 'Marca la orden como cancelada. No se puede cancelar si ya fue recibida.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Orden cancelada exitosamente',
      content: {
        'application/json': {
          schema: OrdenCompraResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/cancelar',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  cancelarOrdenCompraHandler
);

// ==================== DELETE /compras/:id ====================
registry.registerPath({
  method: 'delete',
  path: '/api/compras/{id}',
  tags: ['Órdenes de Compra'],
  summary: 'Eliminar una orden de compra',
  description: 'Elimina una orden de compra. No se puede eliminar si ya fue recibida.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Orden de compra eliminada exitosamente',
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
  deleteOrdenCompraHandler
);

export default router;
