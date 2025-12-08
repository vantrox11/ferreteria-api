import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * Enum de acciones de auditoría
 */
export const AccionAuditoriaEnum = z.enum([
  'CREAR',
  'ACTUALIZAR',
  'ELIMINAR',
  'ANULAR',
  'AJUSTAR',
  'LOGIN',
  'LOGOUT'
]);

/**
 * Schema para usuario simplificado en auditoría
 */
const UsuarioAuditoriaSchema = z.object({
  id: z.number().int().positive().openapi({
    description: 'ID del usuario',
    example: 1,
  }),
  nombre: z.string().nullable().openapi({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
  }),
  email: z.string().email().openapi({
    description: 'Email del usuario',
    example: 'juan@empresa.com',
  }),
});

/**
 * DTO de respuesta para un log de auditoría
 */
export const AuditoriaLogResponseSchema = registry.register(
  'AuditoriaLog',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del log de auditoría',
      example: 1,
    }),
    fecha: z.string().datetime().openapi({
      description: 'Fecha y hora del evento',
      example: '2024-01-15T10:30:00Z',
    }),
    usuario_id: z.number().int().openapi({
      description: 'ID del usuario que realizó la acción',
      example: 1,
    }),
    usuario: UsuarioAuditoriaSchema.optional().openapi({
      description: 'Usuario que realizó la acción',
    }),
    accion: AccionAuditoriaEnum.openapi({
      description: 'Tipo de acción realizada',
      example: 'CREAR',
    }),
    tabla_afectada: z.string().openapi({
      description: 'Tabla afectada por la acción',
      example: 'Productos',
    }),
    registro_id: z.number().int().nullable().openapi({
      description: 'ID del registro afectado',
      example: 123,
    }),
    datos_antes: z.any().nullable().openapi({
      description: 'Estado anterior del registro (JSON)',
      example: { nombre: 'Producto Viejo', precio: 10.50 },
    }),
    datos_despues: z.any().nullable().openapi({
      description: 'Estado posterior del registro (JSON)',
      example: { nombre: 'Producto Nuevo', precio: 12.00 },
    }),
    ip_address: z.string().nullable().openapi({
      description: 'Dirección IP del cliente',
      example: '192.168.1.100',
    }),
    user_agent: z.string().nullable().openapi({
      description: 'User agent del navegador',
      example: 'Mozilla/5.0...',
    }),
    tenant_id: z.number().int().openapi({
      example: 1,
    }),
  })
);
export type AuditoriaLogResponseDTO = z.infer<typeof AuditoriaLogResponseSchema>;

/**
 * DTO de respuesta para lista de logs de auditoría
 */
export const AuditoriaListResponseSchema = registry.register(
  'AuditoriaList',
  z.object({
    total: z.number().int().openapi({
      description: 'Cantidad total de logs',
      example: 25,
    }),
    data: z.array(AuditoriaLogResponseSchema).openapi({
      description: 'Lista de logs de auditoría',
    }),
  })
);
export type AuditoriaListResponseDTO = z.infer<typeof AuditoriaListResponseSchema>;

/**
 * Schema para usuario activo en estadísticas
 */
const UsuarioActivoSchema = z.object({
  usuario_id: z.number().int().openapi({
    description: 'ID del usuario',
    example: 1,
  }),
  nombre: z.string().openapi({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
  }),
  email: z.string().email().openapi({
    description: 'Email del usuario',
    example: 'juan@empresa.com',
  }),
  count: z.number().int().openapi({
    description: 'Cantidad de acciones realizadas',
    example: 45,
  }),
});

/**
 * Schema para periodo de estadísticas
 */
const PeriodoEstadisticasSchema = z.object({
  desde: z.string().datetime().openapi({
    description: 'Fecha de inicio del periodo',
    example: '2024-01-08T00:00:00Z',
  }),
  hasta: z.string().datetime().openapi({
    description: 'Fecha de fin del periodo',
    example: '2024-01-15T23:59:59Z',
  }),
});

/**
 * DTO de respuesta para estadísticas de auditoría
 */
export const EstadisticasAuditoriaResponseSchema = registry.register(
  'EstadisticasAuditoria',
  z.object({
    periodo: PeriodoEstadisticasSchema.openapi({
      description: 'Periodo de las estadísticas',
    }),
    total_eventos: z.number().int().openapi({
      description: 'Total de eventos en el periodo',
      example: 150,
    }),
    por_accion: z.record(z.string(), z.number().int()).openapi({
      description: 'Cantidad de eventos agrupados por tipo de acción',
      example: { CREAR: 50, ACTUALIZAR: 70, ELIMINAR: 15, LOGIN: 15 },
    }),
    por_tabla: z.record(z.string(), z.number().int()).openapi({
      description: 'Cantidad de eventos agrupados por tabla afectada',
      example: { productos: 60, ventas: 40, clientes: 25, usuarios: 25 },
    }),
    usuarios_mas_activos: z.array(UsuarioActivoSchema).openapi({
      description: 'Top 10 usuarios más activos en el periodo',
    }),
  })
);
export type EstadisticasAuditoriaResponseDTO = z.infer<typeof EstadisticasAuditoriaResponseSchema>;

/**
 * Query params para listar logs de auditoría
 */
export const ListAuditoriaQuerySchema = registry.register(
  'ListAuditoriaQuery',
  z.object({
    usuario_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de usuario',
      example: 1,
    }),
    accion: AccionAuditoriaEnum.optional().openapi({
      description: 'Filtrar por tipo de acción',
      example: 'CREAR',
    }),
    tabla_afectada: z.string().optional().openapi({
      description: 'Filtrar por tabla afectada',
      example: 'Productos',
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango (ISO 8601)',
      example: '2025-11-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha de fin del rango (ISO 8601)',
      example: '2025-11-30T23:59:59Z',
    }),
    limit: z.coerce.number().int().positive().optional().openapi({
      description: 'Límite de resultados',
      example: 100,
    }),
  })
);
export type ListAuditoriaQueryDTO = z.infer<typeof ListAuditoriaQuerySchema>;
