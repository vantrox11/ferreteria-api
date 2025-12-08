import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getTenantConfiguracionHandler,
  updateTenantConfiguracionHandler,
  getTenantFiscalConfigHandler,
  updateTenantFiscalConfigHandler,
} from '../controllers/tenant.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import { 
  TenantConfiguracionResponseSchema,
  TenantConfigFiscalResponseSchema,
  UpdateTenantConfiguracionSchema,
  UpdateTenantConfigFiscalSchema
} from '../dtos/tenant.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/tenant/configuracion',
  tags: ['Tenant'],
  summary: 'Obtener configuración completa del tenant',
  description: 'Retorna el objeto JSON de configuración del tenant actual. Incluye configuración fiscal (IGV), preferencias de negocio, etc.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Configuración del tenant',
      content: {
        'application/json': {
          schema: TenantConfiguracionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/tenant/configuracion',
  tags: ['Tenant'],
  summary: 'Actualizar configuración completa del tenant (Solo Admin)',
  description: 'Actualiza el objeto JSON de configuración del tenant mediante merge profundo. Los campos no proporcionados se mantienen.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateTenantConfiguracionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Configuración actualizada exitosamente',
      content: {
        'application/json': {
          schema: TenantConfiguracionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/tenant/configuracion/fiscal',
  tags: ['Tenant'],
  summary: 'Obtener configuración fiscal del tenant',
  description: 'Retorna solo la configuración tributaria (IGV/IVA) del tenant. Endpoint especializado para la sección de facturación.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Configuración fiscal',
      content: {
        'application/json': {
          schema: TenantConfigFiscalResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/tenant/configuracion/fiscal',
  tags: ['Tenant'],
  summary: 'Actualizar configuración fiscal (Solo Admin)',
  description: 'Actualiza solo la configuración tributaria del tenant. Útil para cambios de tasa de IGV o migración a zona exonerada. IMPORTANTE: Este cambio NO afecta ventas históricas (usan snapshot).',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateTenantConfigFiscalSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Configuración fiscal actualizada exitosamente',
      content: {
        'application/json': {
          schema: TenantConfigFiscalResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.get('/configuracion', getTenantConfiguracionHandler);

router.put(
  '/configuracion',
  requireRoles(['admin']),
  validateRequest(z.object({ body: UpdateTenantConfiguracionSchema })),
  updateTenantConfiguracionHandler
);

router.get('/configuracion/fiscal', getTenantFiscalConfigHandler);

router.patch(
  '/configuracion/fiscal',
  requireRoles(['admin']),
  validateRequest(z.object({ body: UpdateTenantConfigFiscalSchema })),
  updateTenantFiscalConfigHandler
);

export default router;