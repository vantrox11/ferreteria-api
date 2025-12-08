import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema } from '../config/openapi-registry';
import { montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * Enum de Métodos de Pago
 */
export const MetodoPagoEnum = z.enum([
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'YAPE',
  'PLIN',
  'CHEQUE',
  'OTROS',
]);

/**
 * DTO para registrar un pago sobre una Cuenta por Cobrar
 */
export const CreatePagoSchema = registry.register(
  'CreatePago',
  z.object({
    monto: montoDecimalSchema.openapi({
      description: 'Monto del pago (máximo 2 decimales)',
      example: 150.50,
    }),
    metodo_pago: MetodoPagoEnum.openapi({
      description: 'Método de pago utilizado',
      example: 'EFECTIVO',
    }),
    referencia: z.string().max(100).optional().openapi({
      description: 'Número de operación, voucher, o referencia del pago',
      example: 'OP-12345678',
    }),
    notas: z.string().max(500).optional().openapi({
      description: 'Notas adicionales sobre el pago',
      example: 'Pago parcial - Cliente abonó primera cuota',
    }),
    sesion_caja_id: z.number().int().positive().optional().openapi({
      description: 'ID de la sesión de caja para registrar el ingreso automático (opcional)',
      example: 1,
    }),
  })
);
export type CreatePagoDTO = z.infer<typeof CreatePagoSchema>;

/**
 * Schema de respuesta para un Pago
 */
export const PagoResponseSchema = registry.register(
  'Pago',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    monto: z.number().openapi({ example: 150.50 }),
    metodo_pago: MetodoPagoEnum.openapi({ example: 'EFECTIVO' }),
    referencia: z.string().nullable().openapi({ example: 'OP-12345678' }),
    fecha_pago: z.string().datetime().openapi({ 
      description: 'Fecha y hora del registro del pago',
      example: '2024-01-15T10:30:00.000Z' 
    }),
    notas: z.string().nullable().openapi({ example: 'Pago parcial' }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    cuenta_id: z.number().int().openapi({ 
      description: 'ID de la Cuenta por Cobrar asociada',
      example: 10 
    }),
    usuario_id: z.number().int().nullable().openapi({ 
      description: 'ID del usuario que registró el pago',
      example: 5 
    }),
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string(),
      email: z.string().email(),
    }).nullable().optional().openapi({
      description: 'Datos del usuario que registró el pago',
    }),
  })
);
export type PagoResponseDTO = z.infer<typeof PagoResponseSchema>;

/**
 * Schema de respuesta paginada para Pagos
 */
export const PaginatedPagoResponseSchema = createPaginatedResponseSchema(PagoResponseSchema, 'PaginatedPagos');
