import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';
import { montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * DTO para crear un movimiento de caja
 */
export const CreateMovimientoCajaSchema = registry.register(
  'CreateMovimientoCaja',
  z.object({
    tipo: z.enum(['INGRESO', 'EGRESO']).openapi({
      description: 'Tipo de movimiento',
      example: 'INGRESO',
    }),
    monto: montoDecimalSchema.openapi({
      description: 'Monto del movimiento (máximo 2 decimales)',
      example: 50.00,
    }),
    descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres para garantizar trazabilidad').max(255).openapi({
      description: 'Descripción detallada del movimiento con formato: "{Acción} por {Documento} {Serie}-{Numero}"',
      example: 'Ingreso por Venta B001-00123',
    }),
    // FKs explícitas para integridad referencial (opcionales, mutuamente exclusivas)
    venta_id: z.number().int().positive().optional().openapi({
      description: 'ID de la venta asociada (opcional)',
      example: 123,
    }),
    nota_credito_id: z.number().int().positive().optional().openapi({
      description: 'ID de la nota de crédito asociada (opcional)',
      example: 45,
    }),
    pago_id: z.number().int().positive().optional().openapi({
      description: 'ID del pago asociado (opcional)',
      example: 67,
    }),
  })
);

export type CreateMovimientoCajaDTO = z.infer<typeof CreateMovimientoCajaSchema>;

/**
 * DTO de respuesta para movimiento de caja
 */
export const MovimientoCajaResponseSchema = registry.register(
  'MovimientoCaja',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del movimiento',
      example: 1,
    }),
    tipo: z.enum(['INGRESO', 'EGRESO']).openapi({
      description: 'Tipo de movimiento',
      example: 'INGRESO',
    }),
    monto: z.number().openapi({
      description: 'Monto del movimiento',
      example: 50.00,
    }),
    descripcion: z.string().openapi({
      description: 'Descripción detallada del movimiento',
      example: 'Devolución efectivo NC B001-123 - FERRETERÍA LÓPEZ SAC',
    }),
    referencia_tipo: z.string().nullable().optional().openapi({
      description: 'Tipo de documento referenciado',
      example: 'NOTA_CREDITO',
    }),
    referencia_id: z.string().nullable().optional().openapi({
      description: 'ID del documento referenciado',
      example: '123',
    }),
    fecha: z.string().datetime().openapi({
      description: 'Fecha del movimiento',
      example: '2025-11-16T14:30:00Z',
    }),
    sesion_caja_id: z.number().int().openapi({
      description: 'ID de la sesión de caja',
      example: 1,
    }),
    sesion_caja: z.object({
      id: z.number().int(),
      caja: z.object({
        nombre: z.string(),
      }),
    }).optional(),
    tenant_id: z.number().int().openapi({ example: 1 }),
  })
);

export type MovimientoCajaResponseDTO = z.infer<typeof MovimientoCajaResponseSchema>;
