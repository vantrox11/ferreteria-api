import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createPagoHandler,
  getPagosByCuentaHandler,
} from '../controllers/pagos.controller';
import { registry, commonResponses, SuccessResponseSchema } from '../config/openapi-registry';
import {
  CreatePagoSchema,
  PagoResponseSchema,
} from '../dtos/pago.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/cuentas-por-cobrar/{id}/pagos',
  tags: ['Pagos (Cuentas por Cobrar)'],
  summary: 'Registrar pago sobre Cuenta por Cobrar',
  description: `Registra un pago (total o parcial) sobre una Cuenta por Cobrar.

**Proceso automático:**
1. Valida que la CxC exista y no esté CANCELADA
2. Valida que el monto no exceda el saldo pendiente
3. Crea registro en tabla Pagos
4. Recalcula saldo_pendiente de la CxC
5. Actualiza estado de la CxC (VIGENTE → PAGADA si saldo = 0)
6. Registra movimiento de caja (INGRESO) si hay sesión activa

**Validaciones:**
- Monto > 0
- Monto <= saldo_pendiente
- CxC no cancelada

**Casos de error:**
- \`CUENTA_NOT_FOUND\`: CxC no existe
- \`CUENTA_CANCELADA\`: No se pueden registrar pagos sobre cuentas anuladas por NC
- \`MONTO_EXCEDE_SALDO\`: El pago supera la deuda pendiente`,
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
            data: PagoResponseSchema,
          }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/cuentas-por-cobrar/{id}/pagos',
  tags: ['Pagos (Cuentas por Cobrar)'],
  summary: 'Listar pagos de una Cuenta por Cobrar',
  description: 'Obtiene el historial completo de pagos registrados sobre una CxC específica.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Lista de pagos de la cuenta',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(PagoResponseSchema),
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

router.post(
  '/:id/pagos',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({
    params: IdParamSchema,
    body: CreatePagoSchema,
  })),
  createPagoHandler
);

router.get(
  '/:id/pagos',
  validateRequest(z.object({ params: IdParamSchema })),
  getPagosByCuentaHandler
);

export default router;
