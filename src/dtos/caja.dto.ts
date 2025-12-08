import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * DTO para crear una nueva caja registradora
 */
export const CreateCajaSchema = registry.register(
  'CreateCaja',
  z.object({
    nombre: z.string().min(1, 'El nombre de la caja es requerido').max(50).openapi({
      description: 'Nombre de la caja registradora',
      example: 'Caja Principal',
    }),
    isActive: z.boolean().optional().default(true).openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
  })
);

export type CreateCajaDTO = z.infer<typeof CreateCajaSchema>;

/**
 * DTO para actualizar una caja
 */
export const UpdateCajaSchema = registry.register(
  'UpdateCaja',
  z.object({
    nombre: z.string().min(1).max(50).optional().openapi({
      description: 'Nombre de la caja registradora',
      example: 'Caja Principal',
    }),
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
  })
);

export type UpdateCajaDTO = z.infer<typeof UpdateCajaSchema>;

/**
 * DTO de respuesta para caja
 */
export const CajaResponseSchema = registry.register(
  'Caja',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la caja',
      example: 1,
    }),
    nombre: z.string().openapi({
      example: 'Caja Principal',
    }),
    isActive: z.boolean().openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
    tenant_id: z.number().int().openapi({
      example: 1,
    }),
  })
);

export type CajaResponseDTO = z.infer<typeof CajaResponseSchema>;

/**
 * Schema para query de listado de cajas
 */
export const ListCajasQuerySchema = registry.register(
  'ListCajasQuery',
  z.object({
    includeInactive: z.string().optional().openapi({
      description: 'Incluir cajas inactivas (true/false)',
      example: 'false',
    }),
  })
);

export type ListCajasQueryDTO = z.infer<typeof ListCajasQuerySchema>;
