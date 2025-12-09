import { db } from '../config/db';
import { AccionAuditoria } from '@prisma/client';

/**
 * Servicio de Auditoría
 * Registra todas las acciones críticas en la tabla AuditoriaLogs
 * Sección 7 del DocumentodeEspecificacionTecnica.md
 */

export interface AuditLogData {
  usuarioId: number;
  tenantId: number;
  accion: AccionAuditoria;
  tablaAfectada: string;
  registroId?: number;
  datosAntes?: any;
  datosDespues?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra un evento de auditoría en la base de datos
 * Este método es asíncrono pero no bloquea la respuesta al usuario
 */
export const registrarAuditoria = async (data: AuditLogData): Promise<void> => {
  try {
    await db.auditoriaLogs.create({
      data: {
        usuario_id: data.usuarioId,
        tenant_id: data.tenantId,
        accion: data.accion,
        tabla_afectada: data.tablaAfectada,
        registro_id: data.registroId,
        datos_antes: data.datosAntes ? JSON.stringify(data.datosAntes) : undefined,
        datos_despues: data.datosDespues ? JSON.stringify(data.datosDespues) : undefined,
        ip_address: data.ipAddress || undefined,
        user_agent: data.userAgent || undefined,
      },
    });
  } catch (error) {
    // No lanzar error para evitar interrumpir la operación principal
    // Solo loguear en consola para debugging
    console.error('[AuditService] Error al registrar auditoría:', error);
  }
};

/**
 * Registra una acción de creación
 */
export const auditarCreacion = async (
  usuarioId: number,
  tenantId: number,
  tabla: string,
  registroId: number,
  datos: any,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'CREAR',
    tablaAfectada: tabla,
    registroId,
    datosDespues: datos,
    ipAddress,
    userAgent,
  });
};

/**
 * Registra una acción de actualización
 */
export const auditarActualizacion = async (
  usuarioId: number,
  tenantId: number,
  tabla: string,
  registroId: number,
  datosAntes: any,
  datosDespues: any,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'ACTUALIZAR',
    tablaAfectada: tabla,
    registroId,
    datosAntes,
    datosDespues,
    ipAddress,
    userAgent,
  });
};

/**
 * Registra una acción de eliminación
 */
export const auditarEliminacion = async (
  usuarioId: number,
  tenantId: number,
  tabla: string,
  registroId: number,
  datosAntes: any,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'ELIMINAR',
    tablaAfectada: tabla,
    registroId,
    datosAntes,
    ipAddress,
    userAgent,
  });
};

/**
 * Registra una anulación (para ventas, pedidos, etc.)
 */
export const auditarAnulacion = async (
  usuarioId: number,
  tenantId: number,
  tabla: string,
  registroId: number,
  datosAntes: any,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'ANULAR',
    tablaAfectada: tabla,
    registroId,
    datosAntes,
    ipAddress,
    userAgent,
  });
};

/**
 * Registra un ajuste de inventario
 */
export const auditarAjuste = async (
  usuarioId: number,
  tenantId: number,
  tabla: string,
  registroId: number,
  datosAntes: any,
  datosDespues: any,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'AJUSTAR',
    tablaAfectada: tabla,
    registroId,
    datosAntes,
    datosDespues,
    ipAddress,
    userAgent,
  });
};

/**
 * Registra un login
 */
export const auditarLogin = async (
  usuarioId: number,
  tenantId: number,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'LOGIN',
    tablaAfectada: 'Usuarios',
    registroId: usuarioId,
    ipAddress,
    userAgent,
  });
};

/**
 * Registra un logout
 */
export const auditarLogout = async (
  usuarioId: number,
  tenantId: number,
  ipAddress?: string,
  userAgent?: string
) => {
  return registrarAuditoria({
    usuarioId,
    tenantId,
    accion: 'LOGOUT',
    tablaAfectada: 'Usuarios',
    registroId: usuarioId,
    ipAddress,
    userAgent,
  });
};

/**
 * Consulta logs de auditoría con filtros
 */
export const consultarAuditoria = async (
  tenantId: number,
  filtros?: {
    usuarioId?: number;
    accion?: AccionAuditoria;
    tablaAfectada?: string;
    fechaInicio?: Date;
    fechaFin?: Date;
    limit?: number;
  }
) => {
  const where: any = { tenant_id: tenantId };

  if (filtros?.usuarioId) where.usuario_id = filtros.usuarioId;
  if (filtros?.accion) where.accion = filtros.accion;
  if (filtros?.tablaAfectada) where.tabla_afectada = filtros.tablaAfectada;
  if (filtros?.fechaInicio || filtros?.fechaFin) {
    where.fecha = {};
    if (filtros.fechaInicio) where.fecha.gte = filtros.fechaInicio;
    if (filtros.fechaFin) where.fecha.lte = filtros.fechaFin;
  }

  return db.auditoriaLogs.findMany({
    where,
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
    },
    orderBy: { fecha: 'desc' },
    take: filtros?.limit || 100,
  });
};
