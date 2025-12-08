import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getAuditoriaHandler,
  getAuditoriaByIdHandler,
  getEstadisticasAuditoriaHandler,
} from '../controllers/auditoria.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  AuditoriaListResponseSchema,
  AuditoriaLogResponseSchema,
  EstadisticasAuditoriaResponseSchema,
  ListAuditoriaQuerySchema,
} from '../dtos/auditoria.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant, checkAuth, requireRoles(['admin']));

// ==================== GET /auditoria ====================
registry.registerPath({
  method: 'get',
  path: '/api/auditoria',
  tags: ['Auditoría'],
  summary: 'Consultar logs de auditoría',
  description: 'Obtiene logs de auditoría con filtros opcionales por usuario, acción, tabla y rango de fechas. Solo accesible para administradores.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListAuditoriaQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de logs de auditoría',
      content: {
        'application/json': {
          schema: AuditoriaListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/',
  validateRequest(z.object({ query: ListAuditoriaQuerySchema })),
  getAuditoriaHandler
);

// ==================== GET /auditoria/estadisticas ====================
registry.registerPath({
  method: 'get',
  path: '/api/auditoria/estadisticas',
  tags: ['Auditoría'],
  summary: 'Obtener estadísticas de auditoría',
  description: 'Genera estadísticas de los últimos 7 días: eventos por acción, por tabla y usuarios más activos. Solo accesible para administradores.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Estadísticas de auditoría',
      content: {
        'application/json': {
          schema: EstadisticasAuditoriaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get('/estadisticas', getEstadisticasAuditoriaHandler);

// ==================== GET /auditoria/:id ====================
registry.registerPath({
  method: 'get',
  path: '/api/auditoria/{id}',
  tags: ['Auditoría'],
  summary: 'Obtener detalle de log específico',
  description: 'Consulta los detalles completos de un log de auditoría específico. Solo accesible para administradores.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Log de auditoría encontrado',
      content: {
        'application/json': {
          schema: AuditoriaLogResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getAuditoriaByIdHandler
);

export default router;
