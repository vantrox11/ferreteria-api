import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getUsuariosHandler,
  createUsuarioHandler,
  getUsuarioByIdHandler,
  updateUsuarioHandler,
  desactivarUsuarioHandler,
} from '../controllers/usuarios.controller';
import { registry, commonResponses, createPaginatedResponseSchema, SuccessResponseSchema } from '../config/openapi-registry';
import { 
  UsuarioResponseSchema,
  CreateUsuarioSchema,
  UpdateUsuarioSchema
} from '../dtos/usuario.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);
router.use(requireRoles(['admin']));

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

const UsuariosPaginatedSchema = createPaginatedResponseSchema(
  UsuarioResponseSchema,
  'UsuariosPaginated'
);

registry.registerPath({
  method: 'get',
  path: '/api/usuarios',
  tags: ['Usuarios'],
  summary: 'Listar usuarios del tenant (Solo Admin)',
  description: 'Obtiene todos los usuarios activos e inactivos del tenant actual con paginación y filtros.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Lista de usuarios',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(UsuarioResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/usuarios',
  tags: ['Usuarios'],
  summary: 'Crear nuevo usuario (Solo Admin)',
  description: 'Crea un usuario empleado o admin para el tenant actual. La contraseña se hashea automáticamente con bcrypt.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUsuarioSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Usuario creado exitosamente',
      content: {
        'application/json': {
          schema: UsuarioResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/usuarios/{id}',
  tags: ['Usuarios'],
  summary: 'Obtener usuario por ID (Solo Admin)',
  description: 'Obtiene los detalles de un usuario específico del tenant.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle del usuario',
      content: {
        'application/json': {
          schema: UsuarioResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/usuarios/{id}',
  tags: ['Usuarios'],
  summary: 'Actualizar usuario (Solo Admin)',
  description: 'Actualiza email, nombre, rol o contraseña de un usuario. La contraseña es opcional y se hashea automáticamente.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateUsuarioSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Usuario actualizado exitosamente',
      content: {
        'application/json': {
          schema: UsuarioResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/usuarios/{id}/desactivar',
  tags: ['Usuarios'],
  summary: 'Desactivar usuario (Solo Admin)',
  description: 'Marca el usuario como inactivo (soft delete). No permite login posterior. No permite que un usuario se desactive a sí mismo.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Usuario desactivado exitosamente',
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

router.get('/', getUsuariosHandler);

router.post(
  '/',
  validateRequest(z.object({ body: CreateUsuarioSchema })),
  createUsuarioHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getUsuarioByIdHandler
);

router.put(
  '/:id',
  validateRequest(z.object({ 
    params: IdParamSchema,
    body: UpdateUsuarioSchema 
  })),
  updateUsuarioHandler
);

router.patch(
  '/:id/desactivar',
  validateRequest(z.object({ params: IdParamSchema })),
  desactivarUsuarioHandler
);

export default router;
