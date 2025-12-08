import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { requireSesionCajaActiva } from '../middlewares/sesion-caja.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getVentasHandler,
  getVentaByIdHandler,
  createVentaHandler,
  updateVentaHandler,
  deleteVentaHandler,
  getSaldoNCHandler,
} from '../controllers/ventas.controller';
import { registry, commonResponses, SuccessResponseSchema } from '../config/openapi-registry';
import {
  VentaResponseSchema,
  CreateVentaSchema,
  UpdateVentaSchema,
  ListVentasQuerySchema,
  PaginatedVentaResponseSchema,
} from '../dtos/venta.dto';
import { IdParamSchema } from '../dtos/common.dto';
import { SaldoNCResponseSchema } from '../dtos/saldo-nc.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/ventas',
  tags: ['Ventas (POS)'],
  summary: 'Listar ventas con filtros y paginación',
  description: 'Obtiene ventas del tenant con paginación, búsqueda y filtros por cliente y fecha.',
  security: [{ bearerAuth: [] }],
  request: {
    query: ListVentasQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de ventas',
      content: {
        'application/json': {
          schema: PaginatedVentaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/ventas/{id}',
  tags: ['Ventas (POS)'],
  summary: 'Obtener detalle de venta',
  description: 'Retorna la venta con todos sus detalles, cliente y snapshot fiscal inmutable.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle de venta con snapshot fiscal',
      content: {
        'application/json': {
          schema: VentaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/ventas',
  tags: ['Ventas (POS)'],
  summary: 'Registrar venta (Requiere sesión de caja activa)',
  description: `Crea una venta completa con validación de stock y descuento automático.
  
**Proceso automático:**
1. Valida sesión de caja ABIERTA del usuario
2. Determina tipo de comprobante (RUC 11 → FACTURA, otros → BOLETA)
3. Asigna serie activa y correlativo
4. Calcula IGV según jerarquía (tenant → producto)
5. Genera snapshot fiscal inmutable
6. Valida stock disponible
7. Descuenta stock de forma atómica

**Snapshot Fiscal:**
- valor_unitario: Precio sin IGV
- precio_unitario: Precio con IGV (lo que ingresa el usuario)
- igv_total: Monto del impuesto
- tasa_igv: Tasa aplicada (histórica)`,
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateVentaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Venta creada exitosamente',
      content: {
        'application/json': {
          schema: VentaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/ventas/{id}',
  tags: ['Ventas (POS)'],
  summary: 'Actualizar venta (Solo Admin - Uso limitado)',
  description: 'Permite actualizar metadatos de la venta. El snapshot fiscal NO puede modificarse.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateVentaSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Venta actualizada exitosamente',
      content: {
        'application/json': {
          schema: VentaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/ventas/{id}',
  tags: ['Ventas (POS)'],
  summary: 'Eliminar venta (Solo Admin - Uso muy limitado)',
  description: '⚠️ ADVERTENCIA: Considerar implementar anulación en lugar de eliminación. En producción, las ventas no deben eliminarse por temas legales (SUNAT).',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Venta eliminada exitosamente',
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
  method: 'get',
  path: '/api/ventas/{id}/saldo-nc',
  tags: ['Ventas (POS)'],
  summary: 'Consultar saldo disponible para Nota de Crédito',
  description: `Calcula el saldo disponible para emitir Notas de Crédito sobre una venta.

**Validaciones:**
- Venta debe tener estado_sunat = ACEPTADO
- Calcula total devuelto (suma de NCs ACEPTADAS + PENDIENTES)
- Retorna saldo disponible y si se puede emitir nueva NC

**Casos de bloqueo:**
- Venta no ACEPTADA por SUNAT
- Saldo totalmente consumido (NC total igual a venta original)`,
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Información de saldo disponible para NC',
      content: {
        'application/json': {
          schema: SaldoNCResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.get(
  '/',
  validateRequest(z.object({ query: ListVentasQuerySchema })),
  getVentasHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getVentaByIdHandler
);

router.post(
  '/',
  requireRoles(['admin', 'empleado']),
  requireSesionCajaActiva,
  validateRequest(z.object({ body: CreateVentaSchema })),
  createVentaHandler
);

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({
    params: IdParamSchema,
    body: UpdateVentaSchema,
  })),
  updateVentaHandler
);

router.delete(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  deleteVentaHandler
);

router.get(
  '/:id/saldo-nc',
  validateRequest(z.object({ params: IdParamSchema })),
  getSaldoNCHandler
);

export default router;