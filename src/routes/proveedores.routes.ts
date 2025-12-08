import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getProveedoresHandler,
  createProveedorHandler,
  getProveedorByIdHandler,
  updateProveedorHandler,
  desactivarProveedorHandler,
} from '../controllers/proveedores.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  ProveedorResponseSchema,
  CreateProveedorSchema,
  UpdateProveedorSchema,
} from '../dtos/proveedor.dto';
import { IdParamSchema, SuccessResponseSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant, checkAuth);

// GET /api/proveedores
registry.registerPath({
  method: 'get',
  path: '/api/proveedores',
  tags: ['Proveedores'],
  summary: 'Listar proveedores',
  description:
    'Lista todos los proveedores activos del tenant. Incluye información de contacto y estado.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Lista de proveedores obtenida exitosamente',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ProveedorResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});
router.get('/', requireRoles(['admin', 'empleado']), getProveedoresHandler);

// GET /api/proveedores/:id
registry.registerPath({
  method: 'get',
  path: '/api/proveedores/{id}',
  tags: ['Proveedores'],
  summary: 'Obtener proveedor por ID',
  description:
    'Retorna la información detallada de un proveedor específico del tenant.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Proveedor encontrado exitosamente',
      content: {
        'application/json': {
          schema: ProveedorResponseSchema,
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
  getProveedorByIdHandler
);

// POST /api/proveedores
registry.registerPath({
  method: 'post',
  path: '/api/proveedores',
  tags: ['Proveedores'],
  summary: 'Crear proveedor',
  description:
    'Crea un nuevo proveedor con RUC/DNI único. Valida formato de documento de identidad (11 dígitos para RUC, 8 para DNI).',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProveedorSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Proveedor creado exitosamente',
      content: {
        'application/json': {
          schema: ProveedorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});
router.post(
  '/',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ body: CreateProveedorSchema })),
  createProveedorHandler
);

// PUT /api/proveedores/:id
registry.registerPath({
  method: 'put',
  path: '/api/proveedores/{id}',
  tags: ['Proveedores'],
  summary: 'Actualizar proveedor',
  description:
    'Actualiza los datos de un proveedor existente. Valida unicidad de RUC/DNI si se modifica.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateProveedorSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Proveedor actualizado exitosamente',
      content: {
        'application/json': {
          schema: ProveedorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});
router.put(
  '/:id',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema, body: UpdateProveedorSchema })),
  updateProveedorHandler
);

// PATCH /api/proveedores/:id/desactivar
registry.registerPath({
  method: 'patch',
  path: '/api/proveedores/{id}/desactivar',
  tags: ['Proveedores'],
  summary: 'Desactivar proveedor',
  description:
    'Realiza soft-delete del proveedor, cambiando isActive a false. El proveedor no se elimina físicamente de la base de datos.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Proveedor desactivado exitosamente',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});
router.patch(
  '/:id/desactivar',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  desactivarProveedorHandler
);

export default router;