import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as auditService from '../services/audit.service';
import { AccionAuditoria } from '@prisma/client';
// Validación manejada por middleware validateRequest

/**
 * GET /api/auditoria
 * Consulta logs de auditoría con filtros opcionales
 * Solo accesible para rol admin
 */
export const getAuditoriaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    const filtros: any = {};
    
    if (req.query.usuario_id) filtros.usuarioId = Number(req.query.usuario_id);
    if (req.query.accion) filtros.accion = req.query.accion as AccionAuditoria;
    if (req.query.tabla_afectada) filtros.tablaAfectada = req.query.tabla_afectada as string;
    if (req.query.fecha_inicio) filtros.fechaInicio = new Date(req.query.fecha_inicio as string);
    if (req.query.fecha_fin) filtros.fechaFin = new Date(req.query.fecha_fin as string);
    if (req.query.limit) filtros.limit = Number(req.query.limit);

    const logs = await auditService.consultarAuditoria(tenantId, filtros);

    // Formatear respuesta
    const resultado = logs.map((log) => ({
      id: log.id,
      fecha: log.fecha,
      usuario: {
        id: log.usuario.id,
        nombre: log.usuario.nombre,
        email: log.usuario.email,
      },
      accion: log.accion,
      tabla: log.tabla_afectada,
      registro_id: log.registro_id,
      datos_antes: log.datos_antes,
      datos_despues: log.datos_despues,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
    }));

    res.status(200).json({
      total: resultado.length,
      data: resultado,
    });
  }
);

/**
 * GET /api/auditoria/:id
 * Obtiene detalles de un log específico
 * Solo accesible para rol admin
 */
export const getAuditoriaByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const logId = Number(req.params.id);

    const log = await auditService.consultarAuditoria(tenantId, {});
    const logEspecifico = log.find((l) => l.id === logId);

    if (!logEspecifico) {
      res.status(404).json({ message: 'Log de auditoría no encontrado' });
      return;
    }

    res.status(200).json({
      id: logEspecifico.id,
      fecha: logEspecifico.fecha,
      usuario: {
        id: logEspecifico.usuario.id,
        nombre: logEspecifico.usuario.nombre,
        email: logEspecifico.usuario.email,
      },
      accion: logEspecifico.accion,
      tabla: logEspecifico.tabla_afectada,
      registro_id: logEspecifico.registro_id,
      datos_antes: logEspecifico.datos_antes,
      datos_despues: logEspecifico.datos_despues,
      ip_address: logEspecifico.ip_address,
      user_agent: logEspecifico.user_agent,
    });
  }
);

/**
 * GET /api/auditoria/estadisticas
 * Obtiene estadísticas de auditoría para dashboard
 * Solo accesible para rol admin
 */
export const getEstadisticasAuditoriaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Consultar últimos 7 días
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 7);

    const logs = await auditService.consultarAuditoria(tenantId, {
      fechaInicio,
      limit: 1000, // Límite alto para estadísticas
    });

    // Agrupar por acción
    const porAccion: Record<string, number> = {};
    logs.forEach((log) => {
      porAccion[log.accion] = (porAccion[log.accion] || 0) + 1;
    });

    // Agrupar por tabla
    const porTabla: Record<string, number> = {};
    logs.forEach((log) => {
      porTabla[log.tabla_afectada] = (porTabla[log.tabla_afectada] || 0) + 1;
    });

    // Usuarios más activos
    const usuariosActivos: Record<number, { nombre: string; email: string; count: number }> = {};
    logs.forEach((log) => {
      if (!usuariosActivos[log.usuario.id]) {
        usuariosActivos[log.usuario.id] = {
          nombre: log.usuario.nombre || 'Sin nombre',
          email: log.usuario.email,
          count: 0,
        };
      }
      usuariosActivos[log.usuario.id].count++;
    });

    const topUsuarios = Object.entries(usuariosActivos)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([id, data]) => ({ usuario_id: parseInt(id), ...data }));

    res.status(200).json({
      periodo: {
        desde: fechaInicio,
        hasta: new Date(),
      },
      total_eventos: logs.length,
      por_accion: porAccion,
      por_tabla: porTabla,
      usuarios_mas_activos: topUsuarios,
    });
  }
);
