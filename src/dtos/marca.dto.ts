import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * DTO para crear una nueva marca
 */
export const CreateMarcaSchema = registry.register(
  'CreateMarca',
  z.object({
    nombre: z.string().min(1, 'El nombre es requerido').max(200).openapi({
      description: 'Nombre de la marca',
      example: 'Stanley',
    }),
    logo_url: z.string().url('El logo debe ser una URL válida').optional().openapi({
      description: 'URL del logo de la marca',
      example: 'https://res.cloudinary.com/ferreteria/image/upload/v1234567890/marcas/stanley.png',
    }),
  })
);
export type CreateMarcaDTO = z.infer<typeof CreateMarcaSchema>;

/**
 * DTO para actualizar una marca existente
 */
export const UpdateMarcaSchema = registry.register(
  'UpdateMarca',
  z.object({
    nombre: z.string().min(1).max(200).optional().openapi({
      description: 'Nombre de la marca',
      example: 'Stanley',
    }),
    logo_url: z.string().url('El logo debe ser una URL válida').optional().nullable().openapi({
      description: 'URL del logo de la marca',
      example: 'https://res.cloudinary.com/ferreteria/image/upload/v1234567890/marcas/stanley.png',
    }),
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo a actualizar' }
  )
);
export type UpdateMarcaDTO = z.infer<typeof UpdateMarcaSchema>;

export const MarcaResponseSchema = registry.register(
  'Marca',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la marca',
      example: 1,
    }),
    nombre: z.string().openapi({
      example: 'Stanley',
    }),
    logo_url: z.string().nullable().openapi({
      example: 'https://res.cloudinary.com/ferreteria/image/upload/v1234567890/marcas/stanley.png',
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
export type MarcaResponseDTO = z.infer<typeof MarcaResponseSchema>;

/**
 * Schema de respuesta paginada para el listado de marcas
 */
export const PaginatedMarcaResponseSchema = createPaginatedResponseSchema(
  MarcaResponseSchema,
  'PaginatedMarcaResponse'
);
