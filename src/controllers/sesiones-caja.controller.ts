import { type Response } from 'express';
import sesionCajaModel from '../models/sesion-caja.model';
import { type RequestWithAuth } from '../middlewares/auth.middleware';

export async function abrirSesionHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const usuarioId = req.user!.id;
    const sesion = await sesionCajaModel.abrirSesion(tenantId, usuarioId, req.body);
    res.status(201).json(sesion);
  } catch (error: any) {
    // Manejo de errores específicos con códigos HTTP apropiados
    const errorMsg = error.message || 'Error desconocido';
    
    // 409 Conflict: Recurso ya existe o está ocupado
    if (errorMsg.includes('ya tienes una sesión') || 
        errorMsg.includes('ya está siendo usada')) {
      return res.status(409).json({ error: errorMsg });
    }
    
    // 404 Not Found: Caja no existe
    if (errorMsg.includes('no existe') || errorMsg.includes('inactiva')) {
      return res.status(404).json({ error: errorMsg });
    }
    
    // 400 Bad Request: Datos inválidos
    if (errorMsg.includes('requerido') || errorMsg.includes('inválido')) {
      return res.status(400).json({ error: errorMsg });
    }
    
    // 500 Internal Server Error: Otros errores
    console.error('[ERROR abrirSesion]:', error);
    res.status(500).json({ error: 'Error interno al abrir sesión de caja' });
  }
}

export async function cerrarSesionHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const usuarioId = req.user!.id;
    const sesionId = Number(req.params.id);
    const sesion = await sesionCajaModel.cerrarSesion(sesionId, tenantId, usuarioId, req.body);
    res.status(200).json(sesion);
  } catch (error: any) {
    const errorMsg = error.message || 'Error desconocido';
    
    // 404 Not Found: Sesión no encontrada
    if (errorMsg.includes('no encontrada') || errorMsg.includes('ya está cerrada')) {
      return res.status(404).json({ error: errorMsg });
    }
    
    // 403 Forbidden: No es dueño de la sesión
    if (errorMsg.includes('no tienes permiso')) {
      return res.status(403).json({ error: errorMsg });
    }
    
    console.error('[ERROR cerrarSesion]:', error);
    res.status(500).json({ error: 'Error interno al cerrar sesión de caja' });
  }
}

export async function getSesionActivaHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const usuarioId = req.user!.id;
    const resultado = await sesionCajaModel.getSesionActiva(tenantId, usuarioId);
    res.status(200).json(resultado);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getHistorialSesionesHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const cajaId = req.query.caja_id ? Number(req.query.caja_id) : undefined;
    const usuarioId = req.query.usuario_id ? Number(req.query.usuario_id) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const sesiones = await sesionCajaModel.getHistorialSesiones(tenantId, cajaId, usuarioId, limit);
    res.status(200).json({ data: sesiones });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSesionByIdHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const sesionId = Number(req.params.id);
    const sesion = await sesionCajaModel.getSesionById(sesionId, tenantId);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.status(200).json(sesion);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Cierre Administrativo de Sesión
 * Solo para usuarios con rol ADMIN o SUPERVISOR
 * Permite cerrar sesiones de otros usuarios (ej: usuario no cerró su turno)
 */
export async function cerrarSesionAdministrativoHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const adminUsuarioId = req.user!.id;
    const sesionId = Number(req.params.id);
    
    // TODO: Verificar que el usuario tenga rol ADMIN o SUPERVISOR
    // Por ahora permitimos a cualquier usuario autenticado (implementar después)
    
    const sesion = await sesionCajaModel.cerrarSesionAdministrativo(
      sesionId,
      tenantId,
      adminUsuarioId,
      req.body
    );
    
    res.status(200).json(sesion);
  } catch (error: any) {
    const errorMsg = error.message || 'Error desconocido';
    
    // 404 Not Found: Sesión no encontrada
    if (errorMsg.includes('no encontrada') || errorMsg.includes('ya está cerrada')) {
      return res.status(404).json({ error: errorMsg });
    }
    
    // 400 Bad Request: Falta motivo u otros datos requeridos
    if (errorMsg.includes('requerido') || errorMsg.includes('motivo')) {
      return res.status(400).json({ error: errorMsg });
    }
    
    console.error('[ERROR cerrarSesionAdministrativo]:', error);
    res.status(500).json({ error: 'Error interno al cerrar sesión administrativamente' });
  }
}

/**
 * Handler para GET /monitor-activo
 * Retorna todas las cajas ABIERTAS con KPIs calculados
 */
export async function getMonitorActivoHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const resultado = await sesionCajaModel.getMonitorActivo(tenantId);
    res.status(200).json(resultado);
  } catch (error: any) {
    console.error('[ERROR getMonitorActivo]:', error);
    res.status(500).json({ error: 'Error al obtener monitor activo' });
  }
}

/**
 * Handler para GET /:id/detalle-completo
 * Retorna radiografía completa de una sesión (abierta o cerrada)
 */
export async function getDetalleCompletoHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const sesionId = Number(req.params.id);
    
    if (isNaN(sesionId)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }
    
    const resultado = await sesionCajaModel.getDetalleCompleto(sesionId, tenantId);
    res.status(200).json(resultado);
  } catch (error: any) {
    const errorMsg = error.message || 'Error desconocido';
    
    if (errorMsg.includes('no encontrada')) {
      return res.status(404).json({ error: errorMsg });
    }
    
    console.error('[ERROR getDetalleCompleto]:', error);
    res.status(500).json({ error: 'Error al obtener detalle completo de sesión' });
  }
}

/**
 * Handler para GET /historial-auditoria
 * Retorna historial de cierres con filtros avanzados
 */
export async function getHistorialAuditoriaHandler(req: RequestWithAuth, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    
    const filters = {
      fecha_inicio: req.query.fecha_inicio ? new Date(req.query.fecha_inicio as string) : undefined,
      fecha_fin: req.query.fecha_fin ? new Date(req.query.fecha_fin as string) : undefined,
      usuario_id: req.query.usuario_id ? Number(req.query.usuario_id) : undefined,
      solo_descuadres: req.query.solo_descuadres === 'true',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };
    
    const resultado = await sesionCajaModel.getHistorialAuditoria(tenantId, filters);
    res.status(200).json(resultado);
  } catch (error: any) {
    console.error('[ERROR getHistorialAuditoria]:', error);
    res.status(500).json({ error: 'Error al obtener historial de auditoría' });
  }
}

