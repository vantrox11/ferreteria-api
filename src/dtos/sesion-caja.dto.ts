import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';
import { montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

// Helper específico para monto inicial (debe ser positivo)
const montoInicialSchema = montoDecimalSchema.pipe(
  z.number().positive('El monto inicial debe ser mayor a 0')
);

// Helper específico para monto final (puede ser cero)
const montoFinalSchema = montoDecimalSchema.pipe(
  z.number().nonnegative('El monto final no puede ser negativo')
);

/**
 * DTO para apertura de sesión de caja
 */
export const AperturaSesionCajaSchema = registry.register(
  'AperturaSesionCaja',
  z.object({
    caja_id: z.number().int().positive('El ID de caja debe ser un número positivo').openapi({
      description: 'ID de la caja registradora',
      example: 1,
    }),
    monto_inicial: montoInicialSchema.openapi({
      description: 'Monto inicial en efectivo al abrir la caja (máximo 2 decimales)',
      example: 100.00,
    }),
  })
);

export type AperturaSesionCajaDTO = z.infer<typeof AperturaSesionCajaSchema>;

/**
 * DTO para cierre de sesión de caja
 */
export const CierreSesionCajaSchema = registry.register(
  'CierreSesionCaja',
  z.object({
    monto_final: montoFinalSchema.openapi({
      description: 'Monto final en efectivo al cerrar (arqueo, máximo 2 decimales)',
      example: 450.00,
    }),
  })
);

export type CierreSesionCajaDTO = z.infer<typeof CierreSesionCajaSchema>;

/**
 * DTO para cierre administrativo de sesión
 * Permite a supervisores/admins cerrar sesiones de otros usuarios
 */
export const CierreAdministrativoSchema = registry.register(
  'CierreAdministrativo',
  z.object({
    monto_final: montoFinalSchema.openapi({
      description: 'Monto contado físicamente en la caja al momento del cierre forzoso',
      example: 450.00,
    }),
    motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').openapi({
      description: 'Razón por la cual se realiza el cierre administrativo',
      example: 'Usuario no cerró su turno. Supervisor contó el efectivo y realizó arqueo.',
    }),
  })
);

export type CierreAdministrativoDTO = z.infer<typeof CierreAdministrativoSchema>;

/**
 * DTO de respuesta de sesión
 */
export const SesionCajaResponseSchema = registry.register(
  'SesionCaja',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la sesión',
      example: 1,
    }),
    fecha_apertura: z.string().datetime().openapi({
      description: 'Fecha y hora de apertura',
      example: '2025-11-16T08:00:00Z',
    }),
    fecha_cierre: z.string().datetime().nullable().openapi({
      description: 'Fecha y hora de cierre',
      example: '2025-11-16T18:00:00Z',
    }),
    monto_inicial: z.number().openapi({
      description: 'Monto inicial',
      example: 100.00,
    }),
    monto_final: z.number().nullable().openapi({
      description: 'Monto final (arqueo)',
      example: 450.00,
    }),
    total_ventas: z.number().nullable().openapi({
      description: 'Total de ventas en la sesión',
      example: 380.00,
    }),
    total_ingresos: z.number().nullable().optional().openapi({
      description: 'Total de ingresos (movimientos tipo INGRESO)',
      example: 50.00,
    }),
    total_egresos: z.number().nullable().openapi({
      description: 'Total de egresos',
      example: 30.00,
    }),
    diferencia: z.number().nullable().openapi({
      description: 'Diferencia entre esperado y arqueo',
      example: 0.00,
    }),
    estado: z.enum(['ABIERTA', 'CERRADA']).openapi({
      description: 'Estado de la sesión',
      example: 'ABIERTA',
    }),
    caja_id: z.number().int().openapi({ example: 1 }),
    caja: z.object({
      id: z.number().int(),
      nombre: z.string(),
    }).optional(),
    usuario_id: z.number().int().openapi({ example: 1 }),
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string().nullable(),
      email: z.string(),
    }).optional(),
    tenant_id: z.number().int().openapi({ example: 1 }),
  })
);

export type SesionCajaResponseDTO = z.infer<typeof SesionCajaResponseSchema>;

/**
 * DTO para consulta de sesión activa
 */
export const SesionActivaResponseSchema = registry.register(
  'SesionActivaResponse',
  z.object({
    sesion: SesionCajaResponseSchema.nullable().openapi({
      description: 'Sesión activa del usuario (null si no hay ninguna)',
    }),
    tiene_sesion_activa: z.boolean().openapi({
      description: 'Indica si el usuario tiene una sesión activa',
      example: true,
    }),
  })
);

export type SesionActivaResponseDTO = z.infer<typeof SesionActivaResponseSchema>;

/**
 * DTO para Monitor Activo - Lista de cajas abiertas
 */
export const MonitorActivoItemSchema = z.object({
  id: z.number().int().openapi({ description: 'ID de la sesión', example: 1 }),
  caja: z.object({
    id: z.number().int(),
    nombre: z.string(),
  }).openapi({ description: 'Información de la caja', example: { id: 1, nombre: 'Caja Principal' } }),
  usuario: z.object({
    id: z.number().int(),
    nombre: z.string().nullable(),
    email: z.string(),
  }).openapi({ description: 'Información del cajero' }),
  hora_apertura: z.string().datetime().openapi({ description: 'Hora de apertura', example: '2025-12-07T08:00:00Z' }),
  monto_inicial: z.number().openapi({ description: 'Monto inicial', example: 100.00 }),
  saldo_actual: z.number().openapi({ description: 'Saldo teórico actual (inicial + ingresos - egresos)', example: 1540.00 }),
  total_ingresos: z.number().openapi({ description: 'Total de ingresos', example: 1500.00 }),
  total_egresos: z.number().openapi({ description: 'Total de egresos', example: 60.00 }),
  cantidad_transacciones: z.number().int().openapi({ description: 'Cantidad de movimientos', example: 15 }),
  estado: z.literal('ABIERTA').openapi({ description: 'Estado de la sesión', example: 'ABIERTA' }),
});

export const MonitorActivoResponseSchema = registry.register(
  'MonitorActivoResponse',
  z.object({
    data: z.array(MonitorActivoItemSchema).openapi({
      description: 'Lista de cajas abiertas con KPIs',
    }),
  })
);

export type MonitorActivoResponseDTO = z.infer<typeof MonitorActivoResponseSchema>;

/**
 * DTO para Detalle Completo de Sesión
 */
export const DetalleCompletoKPIsSchema = z.object({
  saldo_inicial: z.number().openapi({ description: 'Saldo inicial', example: 100.00 }),
  total_ingresos: z.number().openapi({ description: 'Total ingresos', example: 1500.00 }),
  total_egresos: z.number().openapi({ description: 'Total egresos', example: 60.00 }),
  saldo_teorico: z.number().openapi({ description: 'Saldo teórico calculado', example: 1540.00 }),
  monto_real: z.number().nullable().openapi({ description: 'Monto real contado (solo si cerrada)', example: 1540.00 }),
  diferencia: z.number().nullable().openapi({ description: 'Diferencia (solo si cerrada)', example: 0.00 }),
});

export const DetalleCompletoDesgloseMetodosSchema = z.object({
  EFECTIVO: z.number().openapi({ example: 1000.00 }),
  TARJETA: z.number().openapi({ example: 300.00 }),
  YAPE: z.number().openapi({ example: 150.00 }),
  PLIN: z.number().openapi({ example: 50.00 }),
  TRANSFERENCIA: z.number().openapi({ example: 100.00 }),
});

export const DetalleCompletoResumenOperativoSchema = z.object({
  cantidad_ventas: z.number().int().openapi({ description: 'Cantidad de ventas', example: 45 }),
  ticket_promedio: z.number().openapi({ description: 'Ticket promedio', example: 50.00 }),
  cantidad_devoluciones: z.number().int().openapi({ description: 'Cantidad de devoluciones', example: 1 }),
  monto_devoluciones: z.number().openapi({ description: 'Monto total devuelto', example: 20.00 }),
});

export const DetalleCompletoMovimientoSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  tipo: z.enum(['INGRESO', 'EGRESO']).openapi({ example: 'INGRESO' }),
  descripcion: z.string().openapi({ example: 'Venta F001-2040' }),
  monto: z.number().openapi({ example: 50.00 }),
  fecha_hora: z.string().datetime().openapi({ example: '2025-12-07T10:00:00Z' }),
  referencia_tipo: z.string().nullable().openapi({ example: 'VENTA' }),
  referencia_id: z.string().nullable().openapi({ example: '123' }),
  es_automatico: z.boolean().openapi({ description: 'Indica si fue generado automáticamente', example: true }),
});

export const DetalleCompletoResponseSchema = registry.register(
  'DetalleCompletoResponse',
  z.object({
    sesion: SesionCajaResponseSchema.openapi({ description: 'Información básica de la sesión' }),
    kpis: DetalleCompletoKPIsSchema.openapi({ description: 'KPIs financieros calculados' }),
    desglose_metodos: DetalleCompletoDesgloseMetodosSchema.openapi({ description: 'Desglose por método de pago' }),
    resumen_operativo: DetalleCompletoResumenOperativoSchema.openapi({ description: 'Resumen operativo del turno' }),
    movimientos: z.array(DetalleCompletoMovimientoSchema).openapi({ description: 'Línea de tiempo unificada' }),
  })
);

export type DetalleCompletoResponseDTO = z.infer<typeof DetalleCompletoResponseSchema>;

/**
 * DTO para Historial de Auditoría
 */
export const HistorialAuditoriaQuerySchema = z.object({
  fecha_inicio: z.string().datetime().optional().openapi({ description: 'Fecha inicio filtro', example: '2025-12-01T00:00:00Z' }),
  fecha_fin: z.string().datetime().optional().openapi({ description: 'Fecha fin filtro', example: '2025-12-07T23:59:59Z' }),
  usuario_id: z.number().int().optional().openapi({ description: 'Filtrar por usuario', example: 1 }),
  solo_descuadres: z.boolean().optional().openapi({ description: 'Ver solo sesiones con descuadres', example: false }),
  page: z.number().int().positive().optional().openapi({ description: 'Página', example: 1 }),
  limit: z.number().int().positive().max(100).optional().openapi({ description: 'Límite por página', example: 50 }),
});

export const HistorialAuditoriaItemSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  caja: z.object({
    id: z.number().int(),
    nombre: z.string(),
  }).openapi({ example: { id: 1, nombre: 'Caja Principal' } }),
  usuario: z.object({
    id: z.number().int(),
    nombre: z.string().nullable(),
    email: z.string(),
  }),
  fecha_apertura: z.string().datetime().openapi({ example: '2025-12-07T08:00:00Z' }),
  fecha_cierre: z.string().datetime().nullable().openapi({ example: '2025-12-07T18:00:00Z' }),
  monto_inicial: z.number().openapi({ example: 100.00 }),
  total_ventas: z.number().openapi({ example: 2500.00 }),
  monto_teorico: z.number().openapi({ description: 'Monto esperado', example: 2600.00 }),
  monto_real: z.number().nullable().openapi({ description: 'Monto contado', example: 2590.00 }),
  diferencia: z.number().openapi({ description: 'Diferencia (negativa=falta, positiva=sobra)', example: -10.00 }),
  tipo_cierre: z.enum(['NORMAL', 'ADMINISTRATIVO']).openapi({ example: 'NORMAL' }),
});

export const HistorialAuditoriaPaginationSchema = z.object({
  total: z.number().int().openapi({ description: 'Total de registros', example: 150 }),
  page: z.number().int().openapi({ description: 'Página actual', example: 1 }),
  limit: z.number().int().openapi({ description: 'Límite por página', example: 50 }),
  total_pages: z.number().int().openapi({ description: 'Total de páginas', example: 3 }),
});

export const HistorialAuditoriaResponseSchema = registry.register(
  'HistorialAuditoriaResponse',
  z.object({
    data: z.array(HistorialAuditoriaItemSchema).openapi({ description: 'Lista de sesiones cerradas' }),
    pagination: HistorialAuditoriaPaginationSchema.openapi({ description: 'Información de paginación' }),
  })
);

export type HistorialAuditoriaResponseDTO = z.infer<typeof HistorialAuditoriaResponseSchema>;

/**
 * Schema para query del historial de sesiones
 */
export const HistorialSesionesQuerySchema = registry.register(
  'HistorialSesionesQuery',
  z.object({
    caja_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de caja',
      example: 1,
    }),
    usuario_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de usuario',
      example: 1,
    }),
    limit: z.coerce.number().int().positive().optional().default(50).openapi({
      description: 'Límite de resultados',
      example: 50,
    }),
  })
);

export type HistorialSesionesQueryDTO = z.infer<typeof HistorialSesionesQuerySchema>;
