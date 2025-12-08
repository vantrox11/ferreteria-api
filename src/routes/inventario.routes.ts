import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getInventarioAjustesHandler,
  getInventarioAjusteByIdHandler,
  createInventarioAjusteHandler,
  deleteInventarioAjusteHandler,
} from '../controllers/inventario.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  InventarioAjusteResponseSchema,
  CreateInventarioAjusteSchema,
  ListInventarioAjustesQuerySchema,
} from '../dtos/inventario.dto';
import { IdParamSchema, SuccessResponseSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant, checkAuth);

// ==================== GET /inventario/ajustes ====================
registry.registerPath({
  method: 'get',
  path: '/api/inventario/ajustes',
  tags: ['Inventario'],
  summary: 'Listar ajustes de inventario',
  description: 'Obtiene el historial de ajustes manuales de inventario con filtros opcionales por producto, tipo y rango de fechas.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListInventarioAjustesQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de ajustes de inventario',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(InventarioAjusteResponseSchema),
            meta: z.object({
              total: z.number().int(),
              page: z.number().int(),
              limit: z.number().int(),
              totalPages: z.number().int(),
            }),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/ajustes',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ query: ListInventarioAjustesQuerySchema })),
  getInventarioAjustesHandler
);

// ==================== GET /inventario/ajustes/:id ====================
registry.registerPath({
  method: 'get',
  path: '/api/inventario/ajustes/{id}',
  tags: ['Inventario'],
  summary: 'Obtener detalle de ajuste',
  description: 'Consulta los detalles completos de un ajuste de inventario específico incluyendo información del producto y usuario.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Ajuste de inventario encontrado',
      content: {
        'application/json': {
          schema: InventarioAjusteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/ajustes/:id',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema })),
  getInventarioAjusteByIdHandler
);

// ==================== POST /inventario/ajustes ====================
registry.registerPath({
  method: 'post',
  path: '/api/inventario/ajustes',
  tags: ['Inventario'],
  summary: 'Crear ajuste de inventario',
  description: 'Registra un ajuste manual de inventario (entrada o salida) y actualiza automáticamente el stock del producto.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateInventarioAjusteSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Ajuste de inventario creado exitosamente',
      content: {
        'application/json': {
          schema: InventarioAjusteResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/ajustes',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateInventarioAjusteSchema })),
  createInventarioAjusteHandler
);

// ==================== DELETE /inventario/ajustes/:id ====================
registry.registerPath({
  method: 'delete',
  path: '/api/inventario/ajustes/{id}',
  tags: ['Inventario'],
  summary: 'Eliminar ajuste de inventario',
  description: 'Elimina un ajuste de inventario. ADVERTENCIA: No reversa automáticamente el stock afectado. Usar con precaución.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Ajuste eliminado exitosamente',
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
  '/ajustes/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  deleteInventarioAjusteHandler
);

export default router;
