import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getPedidosHandler,
  getPedidoByIdHandler,
  confirmarPedidoHandler,
  cancelarPedidoHandler,
  generarVentaDesdePedidoHandler,
} from '../controllers/pedidos.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  PedidoResponseSchema,
  ListPedidosQuerySchema,
  ConfirmarPedidoSchema,
  CancelarPedidoSchema,
  GenerarVentaSchema,
  GenerarVentaResponseSchema,
} from '../dtos/pedido.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ==================== GET /pedidos ====================
registry.registerPath({
  method: 'get',
  path: '/api/pedidos',
  tags: ['Pedidos'],
  summary: 'Listar pedidos con filtros',
  description: 'Obtiene todos los pedidos del tenant con filtro opcional por estado. Incluye alertas por vencer.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListPedidosQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de pedidos',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(PedidoResponseSchema),
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
  validateRequest(z.object({ query: ListPedidosQuerySchema })),
  getPedidosHandler
);

// ==================== GET /pedidos/:id ====================
registry.registerPath({
  method: 'get',
  path: '/api/pedidos/{id}',
  tags: ['Pedidos'],
  summary: 'Obtener detalle de pedido',
  description: 'Consulta los detalles completos de un pedido incluyendo productos y stock actual.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Pedido encontrado',
      content: {
        'application/json': {
          schema: PedidoResponseSchema,
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
  getPedidoByIdHandler
);

// ==================== POST /pedidos/:id/confirmar ====================
registry.registerPath({
  method: 'post',
  path: '/api/pedidos/{id}/confirmar',
  tags: ['Pedidos'],
  summary: 'Confirmar un pedido',
  description: 'Cambia el estado del pedido a confirmado. Solo pedidos pendientes pueden confirmarse.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: ConfirmarPedidoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Pedido confirmado exitosamente',
      content: {
        'application/json': {
          schema: PedidoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/confirmar',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema, body: ConfirmarPedidoSchema })),
  confirmarPedidoHandler
);

// ==================== POST /pedidos/:id/cancelar ====================
registry.registerPath({
  method: 'post',
  path: '/api/pedidos/{id}/cancelar',
  tags: ['Pedidos'],
  summary: 'Cancelar un pedido',
  description: 'Cambia el estado del pedido a cancelado. Solo pedidos pendientes o confirmados pueden cancelarse.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CancelarPedidoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Pedido cancelado exitosamente',
      content: {
        'application/json': {
          schema: PedidoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/cancelar',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema, body: CancelarPedidoSchema })),
  cancelarPedidoHandler
);

// ==================== POST /pedidos/:id/generar-venta ====================
registry.registerPath({
  method: 'post',
  path: '/api/pedidos/{id}/generar-venta',
  tags: ['Pedidos'],
  summary: 'Generar venta desde pedido',
  description: 'Crea una venta POS desde un pedido confirmado y actualiza automáticamente el stock.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: GenerarVentaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Venta generada exitosamente',
      content: {
        'application/json': {
          schema: GenerarVentaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/generar-venta',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema, body: GenerarVentaSchema })),
  generarVentaDesdePedidoHandler
);

export default router;