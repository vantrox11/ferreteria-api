/**
 * CONTROLADOR DE GUÍAS DE REMISIÓN
 * 
 * Endpoints:
 * - POST /api/guias-remision - Crear GRE
 * - GET /api/guias-remision - Listar con filtros y paginación
 * - GET /api/guias-remision/:id - Obtener detalle
 */

import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as guiaRemisionModel from '../models/guia-remision.model';

/**
 * @route POST /api/guias-remision
 * @description Crear una nueva Guía de Remisión
 * @access Private
 */
export const createGuiaRemision = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const tenantId = req.tenantId!;
  const usuarioId = req.user!.id;
  
  // Validación ya realizada por middleware validateRequest
  const data = req.body;
  
  try {
    const guiaRemision = await guiaRemisionModel.createGuiaRemision(tenantId, data, usuarioId);
    
    res.status(201).json({
      success: true,
      message: 'Guía de Remisión creada exitosamente',
      data: guiaRemision,
    });
  } catch (error: any) {
    // Manejar errores específicos del modelo
    if (error.code === 'VENTA_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Venta de referencia no encontrada',
      });
      return;
    }
    
    if (error.code === 'PRODUCTO_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Uno o más productos no fueron encontrados',
      });
      return;
    }
    
    throw error;
  }
});

/**
 * @route GET /api/guias-remision
 * @description Listar Guías de Remisión con filtros
 * @access Private
 */
export const listGuiasRemision = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const tenantId = req.tenantId!;
  
  // Validación ya realizada por middleware validateRequest
  const filters = req.query;
  
  // Convertir strings de query params a tipos correctos
  const parsedFilters = {
    page: filters.page ? Number(filters.page) : undefined,
    limit: filters.limit ? Number(filters.limit) : undefined,
    q: filters.q as string | undefined,
    venta_id: filters.venta_id ? Number(filters.venta_id) : undefined,
    estado_sunat: filters.estado_sunat as string | undefined,
    motivo: filters.motivo as string | undefined,
    fecha_inicio: filters.fecha_inicio ? new Date(filters.fecha_inicio as string) : undefined,
    fecha_fin: filters.fecha_fin ? new Date(filters.fecha_fin as string) : undefined,
  };
  
  const result = await guiaRemisionModel.listGuiasRemision(tenantId, parsedFilters);
  
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @route GET /api/guias-remision/:id
 * @description Obtener detalle de una Guía de Remisión
 * @access Private
 */
export const getGuiaRemisionById = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
    });
    return;
  }
  
  try {
    const guiaRemision = await guiaRemisionModel.getGuiaRemisionById(tenantId, id);
    
    res.status(200).json({
      success: true,
      data: guiaRemision,
    });
  } catch (error: any) {
    if (error.code === 'GRE_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Guía de Remisión no encontrada',
      });
      return;
    }
    
    throw error;
  }
});
