import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * DTO para crear una nueva serie SUNAT
 */
export const CreateSerieSchema = registry.register(
  'CreateSerie',
  z.object({
    codigo: z
      .string()
      .length(4, 'El código debe tener exactamente 4 caracteres')
      .regex(/^[A-Z0-9]{4}$/, 'El código debe contener solo letras mayúsculas y números')
      .openapi({
        description: 'Código de serie SUNAT (ej: F001, B001)',
        example: 'F001',
      }),
    tipo_comprobante: z.enum(['FACTURA', 'BOLETA', 'NOTA_VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION']).openapi({
      description: 'Tipo de comprobante para esta serie',
      example: 'FACTURA',
    }),
    caja_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID de la caja asignada a esta serie (opcional)',
      example: 1,
    }),
    isActive: z.boolean().optional().default(true).openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
  })
);

export type CreateSerieDTO = z.infer<typeof CreateSerieSchema>;

/**
 * DTO para actualizar una serie
 */
export const UpdateSerieSchema = registry.register(
  'UpdateSerie',
  z.object({
    codigo: z
      .string()
      .length(4)
      .regex(/^[A-Z0-9]{4}$/)
      .optional()
      .openapi({
        description: 'Código de serie SUNAT',
        example: 'F001',
      }),
    tipo_comprobante: z.enum(['FACTURA', 'BOLETA', 'NOTA_VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION']).optional().openapi({
      description: 'Tipo de comprobante',
      example: 'FACTURA',
    }),
    caja_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID de la caja asignada',
      example: 1,
    }),
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
  })
);

export type UpdateSerieDTO = z.infer<typeof UpdateSerieSchema>;

/**
 * DTO de respuesta para serie
 */
export const SerieResponseSchema = registry.register(
  'Serie',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la serie',
      example: 1,
    }),
    codigo: z.string().openapi({
      description: 'Código de serie SUNAT',
      example: 'F001',
    }),
    tipo_comprobante: z.enum(['FACTURA', 'BOLETA', 'NOTA_VENTA']).openapi({
      description: 'Tipo de comprobante',
      example: 'FACTURA',
    }),
    correlativo_actual: z.number().int().openapi({
      description: 'Número correlativo actual de la serie',
      example: 157,
    }),
    isActive: z.boolean().openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
    caja_id: z.number().int().nullable().optional().openapi({
      description: 'ID de la caja asignada',
      example: 1,
    }),
    caja: z.object({
      id: z.number().int(),
      nombre: z.string(),
    }).nullable().optional().openapi({
      description: 'Información de la caja asignada',
    }),
    tenant_id: z.number().int().openapi({
      example: 1,
    }),
  })
);

export type SerieResponseDTO = z.infer<typeof SerieResponseSchema>;

/**
 * Query params para listar series (filtros opcionales)
 */
export const ListSeriesQuerySchema = registry.register(
  'ListSeriesQuery',
  z.object({
    tipo_comprobante: z.enum(['FACTURA', 'BOLETA', 'NOTA_VENTA']).optional().openapi({
      description: 'Filtrar por tipo de comprobante',
      example: 'FACTURA',
    }),
    includeInactive: z.string().optional().openapi({
      description: 'Incluir series inactivas (true/false)',
      example: 'false',
    }),
  })
);
export type ListSeriesQueryDTO = z.infer<typeof ListSeriesQuerySchema>;
