import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getCobranzasHandler,
  getCuentaPorCobrarByIdHandler,
  registrarPagoHandler,
  getResumenCobranzasHandler,
  updateCuentaPorCobrarHandler,
  getCreditoDisponibleHandler,
} from '../controllers/cobranzas.controller';
import { registry, commonResponses, SuccessResponseSchema } from '../config/openapi-registry';
import {
  CreatePagoSchema,
  PagoResponseSchema,
  CuentaPorCobrarResponseSchema,
  PaginatedCobranzaResponseSchema,
  ListCobranzasQuerySchema,
  UpdateCuentaPorCobrarSchema,
  ResumenCobranzasSchema,
} from '../dtos/cobranza.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

/**
 * GET /api/cobranzas - Listar cuentas por cobrar
 */
registry.registerPath({
  method: 'get',
  path: '/api/cobranzas',
  tags: ['Cobranzas'],
  summary: 'Listar cuentas por cobrar con paginación y filtros',
  description: 'Obtiene las cuentas por cobrar del tenant con paginación, búsqueda por cliente y filtros por estado/fecha de vencimiento.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListCobranzasQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de cuentas por cobrar',
      content: {
        'application/json': {
          schema: PaginatedCobranzaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/cobranzas/resumen - Resumen de cobranzas
 */
registry.registerPath({
  method: 'get',
  path: '/api/cobranzas/resumen',
  tags: ['Cobranzas'],
  summary: 'Obtener resumen de cobranzas (estadísticas)',
  description: 'Obtiene estadísticas agregadas de cuentas por cobrar: total vigentes, vencidas, montos, etc.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Resumen de cobranzas',
      content: {
        'application/json': {
          schema: ResumenCobranzasSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/cobranzas/:id - Obtener cuenta por cobrar específica
 */
registry.registerPath({
  method: 'get',
  path: '/api/cobranzas/{id}',
  tags: ['Cobranzas'],
  summary: 'Obtener cuenta por cobrar por ID',
  description: 'Obtiene los detalles completos de una cuenta por cobrar, incluyendo venta, cliente y pagos realizados.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de la cuenta por cobrar',
      content: {
        'application/json': {
          schema: CuentaPorCobrarResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * POST /api/cobranzas/:id/pagos - Registrar pago
 */
registry.registerPath({
  method: 'post',
  path: '/api/cobranzas/{id}/pagos',
  tags: ['Cobranzas'],
  summary: 'Registrar un pago (amortización)',
  description: 'Registra un pago parcial o total en una cuenta por cobrar. Actualiza automáticamente los saldos y estados de la cuenta y la venta asociada.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CreatePagoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Pago registrado exitosamente',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            pago: PagoResponseSchema,
          }),
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * PATCH /api/cobranzas/:id - Actualizar notas
 */
registry.registerPath({
  method: 'patch',
  path: '/api/cobranzas/{id}',
  tags: ['Cobranzas'],
  summary: 'Actualizar notas de cuenta por cobrar',
  description: 'Permite agregar o modificar observaciones internas en una cuenta por cobrar.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCuentaPorCobrarSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Cuenta actualizada',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

/**
 * GET /api/cobranzas/clientes/:clienteId/credito-disponible
 */
registry.registerPath({
  method: 'get',
  path: '/api/cobranzas/clientes/{clienteId}/credito-disponible',
  tags: ['Cobranzas'],
  summary: 'Consultar crédito disponible de un cliente',
  description: 'Obtiene el límite de crédito, deuda actual y crédito disponible de un cliente específico. Útil para validaciones en el POS antes de crear ventas a crédito.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      clienteId: z.string().regex(/^\d+$/).transform(Number).openapi({
        description: 'ID del cliente',
        example: '1',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Información de crédito del cliente',
      content: {
        'application/json': {
          schema: z.object({
            cliente: z.object({
              id: z.number().int(),
              nombre: z.string(),
            }),
            limite_credito: z.number().openapi({ example: 5000.00 }),
            deuda_actual: z.number().openapi({ example: 1500.00 }),
            credito_disponible: z.number().openapi({ example: 3500.00 }),
            dias_credito: z.number().int().openapi({ example: 30 }),
            tiene_credito_habilitado: z.boolean().openapi({ example: true }),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

// Listar cuentas por cobrar
router.get(
  '/',
  validateRequest(z.object({ query: ListCobranzasQuerySchema })),
  getCobranzasHandler
);

// Resumen de cobranzas (debe ir antes de /:id para evitar conflicto de rutas)
router.get('/resumen', getResumenCobranzasHandler);

// Crédito disponible de cliente
router.get(
  '/clientes/:clienteId/credito-disponible',
  getCreditoDisponibleHandler
);

// Obtener cuenta por cobrar específica
router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getCuentaPorCobrarByIdHandler
);

// Registrar pago
router.post(
  '/:id/pagos',
  validateRequest(z.object({
    params: IdParamSchema,
    body: CreatePagoSchema,
  })),
  registrarPagoHandler
);

// Actualizar notas
router.patch(
  '/:id',
  validateRequest(z.object({
    params: IdParamSchema,
    body: UpdateCuentaPorCobrarSchema,
  })),
  updateCuentaPorCobrarHandler
);

export default router;
