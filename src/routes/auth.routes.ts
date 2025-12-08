import { Router } from 'express';
import { z } from 'zod';
import {
    registerTenantHandler,
    loginHandler,
    verifyTenantHandler
} from '../controllers/auth.controller';
import { checkTenant } from '../middlewares/tenant.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { registry, commonResponses, SuccessResponseSchema } from '../config/openapi-registry';
import { 
  RegisterTenantSchema, 
  LoginSchema, 
  VerifyTenantSchema,
  RegisterResponseSchema,
  LoginResponseSchema
} from '../dtos/auth.dto';

const router = Router();

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Autenticación'],
  summary: 'Registrar nuevo tenant',
  description: 'Crea un nuevo tenant (empresa) con usuario administrador. Genera automáticamente 12 unidades de medida SUNAT. El tenant queda en estado isActive: false hasta su verificación.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterTenantSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Tenant creado exitosamente',
      content: {
        'application/json': {
          schema: RegisterResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/verify',
  tags: ['Autenticación'],
  summary: 'Verificar y activar tenant (Desarrollo)',
  description: 'En modo desarrollo (TENANT_ACTIVATION_MODE=manual), activa un tenant manualmente. En producción, la activación es automática vía email.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyTenantSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tenant activado exitosamente',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Autenticación'],
  summary: 'Iniciar sesión',
  description: 'Autentica un usuario y retorna un token JWT. Requiere que el request incluya el subdominio del tenant en el hostname. El token incluye: usuario_id, tenant_id, y rol.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login exitoso',
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.post(
  '/register',
  validateRequest(z.object({ body: RegisterTenantSchema })),
  registerTenantHandler
);

router.post(
  '/verify',
  validateRequest(z.object({ body: VerifyTenantSchema })),
  verifyTenantHandler
);

router.post(
  '/login',
  checkTenant,
  validateRequest(z.object({ body: LoginSchema })),
  loginHandler
);

export default router;
