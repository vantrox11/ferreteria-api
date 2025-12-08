import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema } from '../config/openapi-registry';
import { esCodigoSUNATValido, UNIDADES_MEDIDA_SUNAT } from '../config/catalogo-sunat';

extendZodWithOpenApi(z);

// Extraer solo los códigos válidos para el enum
const CODIGOS_SUNAT_VALIDOS = UNIDADES_MEDIDA_SUNAT.map(u => u.codigo) as [string, ...string[]];

/**
 * DTO para crear una nueva unidad de medida
 * Permite códigos SUNAT oficiales o personalizados (máximo 10 caracteres)
 */
export const CreateUnidadMedidaSchema = registry.register(
  'CreateUnidadMedida',
  z.object({
    codigo: z.string()
      .min(1, 'El código es requerido')
      .max(10, 'El código no puede exceder 10 caracteres')
      .regex(/^[A-Z0-9]+$/, 'El código debe contener solo letras mayúsculas y números')
      .openapi({
        description: 'Código de la unidad de medida (SUNAT o personalizado)',
        example: 'NIU',
      }),
    nombre: z.string().min(1, 'El nombre es requerido').max(100).openapi({
      description: 'Nombre descriptivo de la unidad',
      example: 'UNIDAD (BIENES)',
    }),
    permite_decimales: z.boolean().default(false).openapi({
      description: 'Indica si permite cantidades con decimales',
      example: false,
    }),
  })
);
export type CreateUnidadMedidaDTO = z.infer<typeof CreateUnidadMedidaSchema>;

/**
 * DTO para actualizar una unidad de medida existente
 */
export const UpdateUnidadMedidaSchema = registry.register(
  'UpdateUnidadMedida',
  CreateUnidadMedidaSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo a actualizar' }
  )
);
export type UpdateUnidadMedidaDTO = z.infer<typeof UpdateUnidadMedidaSchema>;

export const UnidadMedidaResponseSchema = registry.register(
  'UnidadMedida',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la unidad de medida',
      example: 1,
    }),
    codigo: z.string().openapi({
      description: 'Código SUNAT',
      example: 'NIU',
    }),
    nombre: z.string().openapi({
      description: 'Nombre de la unidad',
      example: 'UNIDAD (BIENES)',
    }),
    permite_decimales: z.boolean().openapi({
      description: 'Permite decimales',
      example: false,
    }),
    tenant_id: z.number().int().openapi({
      example: 1,
    }),
  })
);
export type UnidadMedidaResponseDTO = z.infer<typeof UnidadMedidaResponseSchema>;

/**
 * Schema de respuesta paginada para el listado de unidades de medida
 */
export const PaginatedUnidadMedidaResponseSchema = createPaginatedResponseSchema(
  UnidadMedidaResponseSchema,
  'PaginatedUnidadMedidaResponse'
);
