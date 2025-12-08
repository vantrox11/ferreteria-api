import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';
import { cantidadDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * Enum para tipo de ajuste de inventario
 */
export const TipoAjusteEnum = z.enum(['entrada', 'salida']);
export type TipoAjusteType = z.infer<typeof TipoAjusteEnum>;

/**
 * DTO para crear un nuevo ajuste de inventario
 */
export const CreateInventarioAjusteSchema = registry.register(
  'CreateInventarioAjuste',
  z.object({
    producto_id: z.number().int().positive('ID de producto requerido').openapi({
      description: 'ID del producto a ajustar',
      example: 1,
    }),
    tipo: TipoAjusteEnum.openapi({
      description: 'Tipo de ajuste: entrada (aumenta stock) o salida (reduce stock)',
      example: 'entrada',
    }),
    cantidad: cantidadDecimalSchema.openapi({
      description: 'Cantidad a ajustar (máximo 3 decimales)',
      example: 10.5,
    }),
    motivo: z.string().min(3, 'Motivo debe tener al menos 3 caracteres').max(500).openapi({
      description: 'Razón del ajuste de inventario',
      example: 'Corrección de inventario físico',
    }),
  })
);
export type CreateInventarioAjusteDTO = z.infer<typeof CreateInventarioAjusteSchema>;

/**
 * DTO de respuesta para ajuste de inventario
 */
export const InventarioAjusteResponseSchema = registry.register(
  'InventarioAjuste',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del ajuste',
      example: 1,
    }),
    producto_id: z.number().int().openapi({
      example: 1,
    }),
    tipo: TipoAjusteEnum.openapi({
      example: 'entrada',
    }),
    cantidad: z.number().openapi({
      example: 10.5,
    }),
    motivo: z.string().openapi({
      example: 'Corrección de inventario físico',
    }),
    usuario_id: z.number().int().nullable().openapi({
      description: 'ID del usuario que realizó el ajuste',
      example: 1,
    }),
    tenant_id: z.number().int().openapi({
      example: 1,
    }),
    created_at: z.string().datetime().openapi({
      description: 'Fecha de creación del ajuste',
      example: '2025-11-16T10:30:00Z',
    }),
  })
);
export type InventarioAjusteResponseDTO = z.infer<typeof InventarioAjusteResponseSchema>;

/**
 * Query params para listar ajustes de inventario
 */
export const ListInventarioAjustesQuerySchema = registry.register(
  'ListInventarioAjustesQuery',
  z.object({
    producto_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de producto',
      example: 1,
    }),
    tipo: TipoAjusteEnum.optional().openapi({
      description: 'Filtrar por tipo de ajuste',
      example: 'entrada',
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango (ISO 8601)',
      example: '2025-11-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha de fin del rango (ISO 8601)',
      example: '2025-11-30T23:59:59Z',
    }),
  })
);
export type ListInventarioAjustesQueryDTO = z.infer<typeof ListInventarioAjustesQuerySchema>;
