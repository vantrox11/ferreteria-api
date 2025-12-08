import { Router } from 'express';
import { z } from 'zod';
import {
  abrirSesionHandler,
  cerrarSesionHandler,
  getSesionActivaHandler,
  getHistorialSesionesHandler,
  getSesionByIdHandler,
  cerrarSesionAdministrativoHandler,
  getMonitorActivoHandler,
  getDetalleCompletoHandler,
  getHistorialAuditoriaHandler,
} from '../controllers/sesiones-caja.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  AperturaSesionCajaSchema,
  CierreSesionCajaSchema,
  CierreAdministrativoSchema,
  SesionCajaResponseSchema,
  SesionActivaResponseSchema,
  HistorialSesionesQuerySchema,
  MonitorActivoResponseSchema,
  DetalleCompletoResponseSchema,
  HistorialAuditoriaResponseSchema,
  HistorialAuditoriaQuerySchema,
} from '../dtos/sesion-caja.dto';
import { IdParamSchema } from '../dtos/common.dto';

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ==================== POST /sesiones-caja/apertura ====================
registry.registerPath({
  method: 'post',
  path: '/api/sesiones-caja/apertura',
  tags: ['Sesiones de Caja'],
  summary: 'Abrir una nueva sesión de caja',
  description: 'Inicia una sesión de caja para el usuario autenticado con monto inicial.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: AperturaSesionCajaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Sesión de caja abierta exitosamente',
      content: {
        'application/json': {
          schema: SesionCajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/apertura',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ body: AperturaSesionCajaSchema })),
  abrirSesionHandler
);

// ==================== POST /sesiones-caja/:id/cierre ====================
registry.registerPath({
  method: 'post',
  path: '/api/sesiones-caja/{id}/cierre',
  tags: ['Sesiones de Caja'],
  summary: 'Cerrar una sesión de caja',
  description: 'Cierra una sesión de caja con monto final y calcula diferencias.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CierreSesionCajaSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sesión de caja cerrada exitosamente',
      content: {
        'application/json': {
          schema: SesionCajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/cierre',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema, body: CierreSesionCajaSchema })),
  cerrarSesionHandler
);

// ==================== GET /sesiones-caja/activa ====================
registry.registerPath({
  method: 'get',
  path: '/api/sesiones-caja/activa',
  tags: ['Sesiones de Caja'],
  summary: 'Obtener sesión activa del usuario',
  description: 'Consulta si el usuario autenticado tiene una sesión de caja abierta.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Consulta exitosa (puede retornar null si no hay sesión activa)',
      content: {
        'application/json': {
          schema: SesionActivaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/activa',
  requireRoles(['admin', 'empleado']),
  getSesionActivaHandler
);

// ==================== GET /sesiones-caja/historial ====================
registry.registerPath({
  method: 'get',
  path: '/api/sesiones-caja/historial',
  tags: ['Sesiones de Caja'],
  summary: 'Obtener historial de sesiones',
  description: 'Lista el historial de sesiones con filtros opcionales por caja y usuario.',
  security: [{ bearerAuth: [] }],
  request: {
    query: HistorialSesionesQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de sesiones',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(SesionCajaResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/historial',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ query: HistorialSesionesQuerySchema })),
  getHistorialSesionesHandler
);

// ==================== GET /sesiones-caja/monitor-activo ====================
registry.registerPath({
  method: 'get',
  path: '/api/sesiones-caja/monitor-activo',
  tags: ['Sesiones de Caja'],
  summary: 'Obtener monitor de cajas activas',
  description: `
    Retorna todas las cajas ABIERTAS con KPIs calculados en tiempo real.
    
    **Datos incluidos:**
    - Información de caja y cajero
    - Hora de apertura
    - Monto inicial
    - Saldo actual teórico (inicial + ingresos - egresos)
    - Total de ingresos y egresos
    - Cantidad de transacciones
    
    **Caso de uso:**
    Pantalla de monitoreo para supervisores que muestra todas las cajas operando en tiempo real.
  `,
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Lista de cajas abiertas con KPIs',
      content: {
        'application/json': {
          schema: MonitorActivoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/monitor-activo',
  requireRoles(['admin', 'empleado']),
  getMonitorActivoHandler
);

// ==================== GET /sesiones-caja/historial-auditoria ====================
registry.registerPath({
  method: 'get',
  path: '/api/sesiones-caja/historial-auditoria',
  tags: ['Sesiones de Caja'],
  summary: 'Obtener historial de auditoría de cierres',
  description: `
    Retorna historial de sesiones CERRADAS con filtros avanzados.
    
    **Filtros disponibles:**
    - Rango de fechas (fecha_inicio, fecha_fin)
    - Usuario específico (usuario_id)
    - Solo descuadres (solo_descuadres=true)
    - Paginación (page, limit)
    
    **Datos incluidos:**
    - Información de caja y cajero
    - Fechas de apertura y cierre
    - Montos (inicial, ventas, teórico, real)
    - Diferencia (negativa=faltante, positiva=sobrante)
    - Tipo de cierre (NORMAL o ADMINISTRATIVO)
    
    **Caso de uso:**
    Auditoría financiera con semáforo visual de descuadres (🟢 Cuadrado, 🔴 Faltante, 🔵 Sobrante).
  `,
  security: [{ bearerAuth: [] }],
  request: {
    query: HistorialAuditoriaQuerySchema,
  },
  responses: {
    200: {
      description: 'Historial de auditoría con paginación',
      content: {
        'application/json': {
          schema: HistorialAuditoriaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/historial-auditoria',
  requireRoles(['admin']),
  getHistorialAuditoriaHandler
);

// ==================== GET /sesiones-caja/:id ====================
registry.registerPath({
  method: 'get',
  path: '/api/sesiones-caja/{id}',
  tags: ['Sesiones de Caja'],
  summary: 'Obtener una sesión por ID',
  description: 'Consulta los detalles de una sesión de caja específica.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Sesión encontrada',
      content: {
        'application/json': {
          schema: SesionCajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/:id',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema })),
  getSesionByIdHandler
);

// ==================== POST /sesiones-caja/:id/cierre-administrativo ====================
registry.registerPath({
  method: 'post',
  path: '/api/sesiones-caja/{id}/cierre-administrativo',
  tags: ['Sesiones de Caja'],
  summary: 'Cierre administrativo de sesión (Solo Supervisores)',
  description: `
    Permite a un supervisor/admin cerrar una sesión de caja de otro usuario.
    
    **Caso de uso típico:**
    - Empleado Pedro dejó su sesión abierta y se fue sin cerrarla
    - Empleado Juan necesita usar esa caja pero está bloqueada
    - El Supervisor cuenta el dinero físico que dejó Pedro
    - El Supervisor ejecuta este endpoint para cerrar la sesión de Pedro
    - Juan ya puede abrir su turno normalmente
    
    **Auditoría:**
    El sistema registra quién realizó el cierre administrativo y el motivo.
    
    **Diferencia con cierre normal:**
    - Cierre normal: Solo el dueño de la sesión puede cerrarla
    - Cierre administrativo: Un supervisor cierra la sesión de otro usuario
  `,
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CierreAdministrativoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sesión cerrada administrativamente',
      content: {
        'application/json': {
          schema: SesionCajaResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.post(
  '/:id/cierre-administrativo',
  requireRoles(['admin']), // Solo admins pueden hacer cierre administrativo
  validateRequest(z.object({ 
    params: IdParamSchema, 
    body: CierreAdministrativoSchema 
  })),
  cerrarSesionAdministrativoHandler
);

// ==================== GET /sesiones-caja/:id/detalle-completo ====================
registry.registerPath({
  method: 'get',
  path: '/api/sesiones-caja/{id}/detalle-completo',
  tags: ['Sesiones de Caja'],
  summary: 'Obtener detalle completo de una sesión',
  description: `
    Retorna la radiografía completa de un turno de caja (abierto o cerrado).
    
    **Datos incluidos:**
    - KPIs financieros (saldo inicial, ingresos, egresos, saldo teórico, diferencia)
    - Desglose por método de pago (Efectivo, Tarjeta, Yape, Plin, Transferencia)
    - Resumen operativo (cantidad ventas, ticket promedio, devoluciones)
    - Línea de tiempo unificada (todos los movimientos ordenados cronológicamente)
    
    **Caso de uso:**
    Vista de detalle para gestión, arqueo y auditoría de caja.
  `,
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle completo de la sesión',
      content: {
        'application/json': {
          schema: DetalleCompletoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

router.get(
  '/:id/detalle-completo',
  requireRoles(['admin', 'empleado']),
  validateRequest(z.object({ params: IdParamSchema })),
  getDetalleCompletoHandler
);

export default router;
