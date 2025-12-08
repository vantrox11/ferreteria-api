/**
 * OpenAPI Registry Central
 * 
 * Este archivo mantiene el registro central de todos los schemas y endpoints
 * para la generación automática de documentación OpenAPI.
 * 
 * Patrón: Schema-First Approach
 * - Los schemas Zod son la única fuente de verdad
 * - La documentación se genera automáticamente
 * - Los tipos TypeScript se infieren de los schemas
 */

import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extender Zod con capacidades OpenAPI
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

// Crear registry central
export const registry = new OpenAPIRegistry();

// ============================================================================
// SCHEMAS COMPARTIDOS (Common DTOs)
// ============================================================================

/**
 * Schema de Paginación (Query params)
 */
export const PaginationQuerySchema = registry.register(
  'PaginationQuery',
  z.object({
    page: z.coerce.number().int().positive().default(1).openapi({
      description: 'Número de página',
      example: 1,
    }),
    limit: z.coerce.number().int().min(0).max(100).default(10).openapi({
      description: 'Cantidad de items por página (máx: 100, 0 = sin límite para datos maestros)',
      example: 10,
    }),
  })
);

/**
 * Schema de Respuesta de Error
 */
export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    message: z.string().openapi({
      description: 'Mensaje de error',
      example: 'Error al procesar la solicitud',
    }),
    errors: z.record(z.string(), z.any()).optional().openapi({
      description: 'Detalles de validación (si aplica)',
    }),
  })
);

/**
 * Schema de Metadata de Paginación
 */
export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative().openapi({
    description: 'Total de items',
    example: 150,
  }),
  page: z.number().int().positive().openapi({
    description: 'Página actual',
    example: 1,
  }),
  limit: z.number().int().positive().openapi({
    description: 'Items por página',
    example: 10,
  }),
  totalPages: z.number().int().nonnegative().openapi({
    description: 'Total de páginas',
    example: 15,
  }),
});

/**
 * Función helper para crear schemas de respuesta paginada
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  schemaName: string
) {
  return registry.register(
    schemaName,
    z.object({
      data: z.array(itemSchema),
      meta: PaginationMetaSchema,
    })
  );
}

/**
 * Schema de Respuesta Simple (success message)
 */
export const SuccessResponseSchema = registry.register(
  'SuccessResponse',
  z.object({
    message: z.string().openapi({
      description: 'Mensaje de éxito',
      example: 'Operación completada exitosamente',
    }),
  })
);

// ============================================================================
// COMPONENTES DE SEGURIDAD
// ============================================================================

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Token JWT obtenido del endpoint /api/auth/login',
});

// ============================================================================
// HEADERS COMUNES
// ============================================================================

export const TenantHeaderSchema = z.object({
  'x-tenant-subdomain': z.string().openapi({
    description: 'Subdominio del tenant',
    example: 'mi-ferreteria',
  }),
});

// ============================================================================
// RESPUESTAS COMUNES REUTILIZABLES
// ============================================================================

export const commonResponses = {
  400: {
    description: 'Error de validación (Datos incorrectos)',
    content: {
      'application/json': {
        schema: z.object({
          message: z.string().openapi({ example: 'Error de validación' }),
          errors: z.array(z.object({
            field: z.string().openapi({ example: 'email' }),
            message: z.string().openapi({ example: 'Email inválido' }),
          })).openapi({ description: 'Lista de campos con errores' }),
        }),
      },
    },
  },
  401: {
    description: 'No autorizado (Token inválido o expirado)',
    content: {
      'application/json': {
        schema: z.object({ 
          message: z.string().openapi({ example: 'No autenticado' })
        }),
      },
    },
  },
  403: {
    description: 'Prohibido (No tiene permisos suficientes o Tenant inactivo)',
    content: {
      'application/json': {
        schema: z.object({ 
          message: z.string().openapi({ example: 'No autorizado' })
        }),
      },
    },
  },
  404: {
    description: 'Recurso no encontrado',
    content: {
      'application/json': {
        schema: z.object({ 
          message: z.string().openapi({ example: 'Recurso no encontrado' })
        }),
      },
    },
  },
  409: {
    description: 'Conflicto (Recurso duplicado)',
    content: {
      'application/json': {
        schema: z.object({ 
          message: z.string().openapi({ example: 'El recurso ya existe' })
        }),
      },
    },
  },
  500: {
    description: 'Error interno del servidor',
    content: {
      'application/json': {
        schema: z.object({ 
          message: z.string().openapi({ example: 'Error interno del servidor' })
        }),
      },
    },
  },
};
