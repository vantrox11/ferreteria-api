import { Router } from 'express';
import { z } from 'zod';
import {
  createMovimientoHandler,
  getMovimientosSesionActivaHandler,
  getMovimientosBySesionHandler,
} from '../controllers/movimientos-caja.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { requireSesionCajaActiva } from '../middlewares/sesion-caja.middleware';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  CreateMovimientoCajaSchema,
  MovimientoCajaResponseSchema,
} from '../dtos/movimiento-caja.dto';
import { SesionIdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ==================== POST /movimientos-caja ====================
registry.registerPath({
  method: 'post',
  path: '/api/movimientos-caja',
  tags: ['Movimientos de Caja'],
  summary: 'Crear un movimiento de caja (INGRESO/EGRESO)',
  description: 'Registra un ingreso o egreso manual en la sesión activa del usuario.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMovimientoCajaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Movimiento registrado exitosamente',
      content: {
        'application/json': {
          schema: MovimientoCajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/',
  requireRoles(['admin', 'empleado']),
  requireSesionCajaActiva,
  validateRequest(z.object({ body: CreateMovimientoCajaSchema })),
  createMovimientoHandler
);

// ==================== GET /movimientos-caja/sesion-activa ====================
registry.registerPath({
  method: 'get',
  path: '/api/movimientos-caja/sesion-activa',
  tags: ['Movimientos de Caja'],
  summary: 'Obtener movimientos de la sesión activa',
  description: 'Lista todos los movimientos de caja de la sesión activa del usuario.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Lista de movimientos',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(MovimientoCajaResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/sesion-activa',
  requireRoles(['admin', 'empleado']),
  getMovimientosSesionActivaHandler
);

// ==================== GET /movimientos-caja/sesion/:sesionId ====================
registry.registerPath({
  method: 'get',
  path: '/api/movimientos-caja/sesion/{sesionId}',
  tags: ['Movimientos de Caja'],
  summary: 'Obtener movimientos de una sesión específica',
  description: 'Lista todos los movimientos de caja de una sesión determinada.',
  security: [{ bearerAuth: [] }],
  request: {
    params: SesionIdParamSchema,
  },
  responses: {
    200: {
      description: 'Lista de movimientos',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(MovimientoCajaResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/sesion/:sesionId',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: SesionIdParamSchema })),
  getMovimientosBySesionHandler
);

export default router;
