import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema } from '../config/openapi-registry';

extendZodWithOpenApi(z);

export const CreateCategoriaSchema = registry.register(
  'CreateCategoria',
  z.object({
    nombre: z.string().min(1, 'El nombre es requerido').openapi({
      description: 'Nombre de la categoría',
      example: 'Herramientas Eléctricas',
    }),
    descripcion: z.string().optional().openapi({
      description: 'Descripción de la categoría',
      example: 'Herramientas eléctricas para construcción y mantenimiento',
    }),
  })
);

export type CreateCategoriaDTO = z.infer<typeof CreateCategoriaSchema>;

export const UpdateCategoriaSchema = registry.register(
  'UpdateCategoria',
  CreateCategoriaSchema.partial().extend({
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo (para borrado lógico)',
      example: true,
    }),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo a actualizar' }
  )
);

export type UpdateCategoriaDTO = z.infer<typeof UpdateCategoriaSchema>;

export const CategoriaResponseSchema = registry.register(
  'Categoria',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la categoría',
      example: 1,
    }),
    nombre: z.string().openapi({
      example: 'Herramientas Eléctricas',
    }),
    descripcion: z.string().nullable().openapi({
      example: 'Herramientas eléctricas para construcción',
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

export type CategoriaResponseDTO = z.infer<typeof CategoriaResponseSchema>;

/**
 * Schema de respuesta paginada para el listado de categorías
 */
export const PaginatedCategoriaResponseSchema = createPaginatedResponseSchema(
  CategoriaResponseSchema,
  'PaginatedCategoriaResponse'
);