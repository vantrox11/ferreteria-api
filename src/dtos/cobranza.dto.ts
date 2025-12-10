import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema, PaginationQuerySchema } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * Schema de respuesta para un pago individual
 * Incluido en CuentaPorCobrar.pagos[]
 */
const PagoEmbeddedSchema = z.object({
  id: z.number().int().openapi({
    description: 'ID único del pago',
    example: 1,
  }),
  monto: z.number().openapi({
    description: 'Monto pagado',
    example: 250.00,
  }),
  metodo_pago: z.string().openapi({
    description: 'Método de pago',
    example: 'EFECTIVO',
  }),
  referencia: z.string().nullable().openapi({
    description: 'Número de operación o referencia',
    example: 'OP-123456789',
  }),
  fecha_pago: z.string().datetime().openapi({
    description: 'Fecha y hora del pago',
    example: '2025-11-30T10:00:00Z',
  }),
  notas: z.string().nullable().openapi({
    description: 'Observaciones del pago',
    example: 'Pago parcial acordado',
  }),
  tenant_id: z.number().int().openapi({ example: 1 }),
  cuenta_id: z.number().int().openapi({
    description: 'ID de la cuenta por cobrar asociada',
    example: 1,
  }),
  usuario_id: z.number().int().nullable().openapi({
    description: 'ID del usuario que registró el pago',
    example: 1,
  }),
  usuario: z.object({
    id: z.number().int(),
    nombre: z.string().nullable(),
    email: z.string(),
  }).nullable().optional().openapi({
    description: 'Datos del usuario que registró el pago',
  }),
});
export type PagoResponseDTO = z.infer<typeof PagoEmbeddedSchema>;

/**
 * Schema de respuesta para cuenta por cobrar
 */
export const CuentaPorCobrarResponseSchema = registry.register(
  'CuentaPorCobrar',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la cuenta',
      example: 1,
    }),
    monto_total: z.number().openapi({
      description: 'Monto total de la deuda',
      example: 500.00,
    }),
    monto_pagado: z.number().openapi({
      description: 'Total abonado',
      example: 250.00,
    }),
    saldo_pendiente: z.number().openapi({
      description: 'Saldo restante',
      example: 250.00,
    }),
    estado: z.enum(['VIGENTE', 'POR_VENCER', 'VENCIDA', 'PAGADA', 'CANCELADA']).openapi({
      description: 'Estado de la cuenta',
      example: 'VIGENTE',
    }),
    fecha_emision: z.string().datetime().openapi({
      description: 'Fecha de emisión de la venta',
      example: '2025-11-01T00:00:00Z',
    }),
    fecha_vencimiento: z.string().datetime().openapi({
      description: 'Fecha de vencimiento del crédito',
      example: '2025-12-01T00:00:00Z',
    }),
    fecha_ultimo_pago: z.string().datetime().nullable().openapi({
      description: 'Fecha del último pago realizado',
      example: '2025-11-15T10:00:00Z',
    }),
    notas: z.string().nullable().openapi({
      description: 'Observaciones internas',
      example: 'Cliente avisó que paga el viernes',
    }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    venta_id: z.number().int().openapi({
      description: 'ID de la venta asociada',
      example: 1,
    }),
    venta: z.object({
      id: z.number().int(),
      total: z.number(),
      created_at: z.string(),
      numero_comprobante: z.number().int().nullable(),
      serie: z.object({
        codigo: z.string(),
        tipo_comprobante: z.string(),
      }).nullable().optional(),
    }).optional().openapi({
      description: 'Datos de la venta asociada',
    }),
    cliente_id: z.number().int().openapi({
      description: 'ID del cliente deudor',
      example: 1,
    }),
    cliente: z.object({
      id: z.number().int(),
      nombre: z.string(),
      documento_identidad: z.string().nullable(),
      ruc: z.string().nullable(),
      telefono: z.string().nullable(),
      email: z.string().nullable(),
    }).optional().openapi({
      description: 'Datos del cliente deudor',
    }),
    pagos: z.array(PagoEmbeddedSchema).optional().openapi({
      description: 'Historial de pagos realizados',
    }),
  })
);
export type CuentaPorCobrarResponseDTO = z.infer<typeof CuentaPorCobrarResponseSchema>;

/**
 * Query params para listar cuentas por cobrar (paginación + filtros)
 */
export const ListCobranzasQuerySchema = registry.register(
  'ListCobranzasQuery',
  PaginationQuerySchema.extend({
    q: z.string().optional().openapi({
      description: 'Búsqueda por nombre de cliente',
      example: 'Juan',
    }),
    cliente_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de cliente',
      example: 1,
    }),
    estado: z.enum(['VIGENTE', 'POR_VENCER', 'VENCIDA', 'PAGADA', 'CANCELADA']).optional().openapi({
      description: 'Filtrar por estado de la cuenta',
      example: 'VIGENTE',
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango de vencimiento (ISO 8601)',
      example: '2025-11-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha fin del rango de vencimiento (ISO 8601)',
      example: '2025-12-31T23:59:59Z',
    }),
  })
);
export type ListCobranzasQueryDTO = z.infer<typeof ListCobranzasQuerySchema>;

/**
 * Schema de respuesta paginada para el listado de cuentas por cobrar
 */
export const PaginatedCobranzaResponseSchema = createPaginatedResponseSchema(
  CuentaPorCobrarResponseSchema,
  'PaginatedCobranzaResponse'
);

/**
 * DTO para actualizar notas de cuenta por cobrar
 */
export const UpdateCuentaPorCobrarSchema = registry.register(
  'UpdateCuentaPorCobrar',
  z.object({
    notas: z.string().max(1000).optional().openapi({
      description: 'Notas u observaciones internas',
      example: 'Cliente confirmó pago para el 15 de diciembre',
    }),
  })
);
export type UpdateCuentaPorCobrarDTO = z.infer<typeof UpdateCuentaPorCobrarSchema>;

/**
 * DTO de respuesta para resumen de cobranzas (estadísticas)
 */
export const ResumenCobranzasSchema = registry.register(
  'ResumenCobranzas',
  z.object({
    total_vigentes: z.number().openapi({
      description: 'Total de cuentas vigentes',
      example: 10,
    }),
    total_vencidas: z.number().openapi({
      description: 'Total de cuentas vencidas',
      example: 3,
    }),
    monto_vigente: z.number().openapi({
      description: 'Suma de saldos pendientes vigentes',
      example: 15000.00,
    }),
    monto_vencido: z.number().openapi({
      description: 'Suma de saldos pendientes vencidos',
      example: 4500.00,
    }),
    monto_por_vencer: z.number().openapi({
      description: 'Suma de saldos que vencen en los próximos 7 días',
      example: 2000.00,
    }),
  })
);
export type ResumenCobranzasDTO = z.infer<typeof ResumenCobranzasSchema>;
