/**
 * CONTROLADOR DE NOTAS DE CRÉDITO
 * 
 * Endpoints:
 * - POST /api/notas-credito - Crear NC
 * - GET /api/notas-credito - Listar con filtros y paginación
 * - GET /api/notas-credito/:id - Obtener detalle
 * - POST /api/notas-credito/:id/reenviar - Reenviar a SUNAT
 */

import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as notaCreditoModel from '../services/notas-credito.service';

/**
 * @route POST /api/notas-credito
 * @description Crear una nueva Nota de Crédito
 * @access Private
 */
export const createNotaCredito = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const tenantId = req.tenantId!;
  const usuarioId = req.user!.id;
  
  // Validación ya realizada por middleware validateRequest
  const data = req.body;
  
  try {
    const notaCredito = await notaCreditoModel.createNotaCredito(tenantId, data, usuarioId);
    
    res.status(201).json({
      success: true,
      message: 'Nota de Crédito creada exitosamente',
      data: notaCredito,
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
    
    if (error.code === 'VENTA_YA_ANULADA') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    
    if (error.code === 'MONTO_EXCEDE_SALDO_DISPONIBLE') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    
    if (error.code === 'NO_PUEDE_ANULAR_CON_PARCIALES') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    
    if (error.code === 'MONTO_NC_EXCEDE_VENTA') {
      res.status(400).json({
        success: false,
        message: 'El monto de la Nota de Crédito excede el monto de la venta original',
      });
      return;
    }
    
    throw error;
  }
});

/**
 * @route GET /api/notas-credito
 * @description Listar Notas de Crédito con filtros
 * @access Private
 */
export const listNotasCredito = asyncHandler(async (req: RequestWithAuth, res: Response) => {
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
    tipo_nota: filters.tipo_nota as string | undefined,
    fecha_inicio: filters.fecha_inicio ? new Date(filters.fecha_inicio as string) : undefined,
    fecha_fin: filters.fecha_fin ? new Date(filters.fecha_fin as string) : undefined,
  };
  
  const result = await notaCreditoModel.listNotasCredito(tenantId, parsedFilters);
  
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @route GET /api/notas-credito/:id
 * @description Obtener detalle de una Nota de Crédito
 * @access Private
 */
export const getNotaCreditoById = asyncHandler(async (req: RequestWithAuth, res: Response) => {
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
    const notaCredito = await notaCreditoModel.getNotaCreditoById(tenantId, id);
    
    res.status(200).json({
      success: true,
      data: notaCredito,
    });
  } catch (error: any) {
    if (error.code === 'NC_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Nota de Crédito no encontrada',
      });
      return;
    }
    
    throw error;
  }
});

/**
 * @route POST /api/notas-credito/:id/reenviar
 * @description Reenviar Nota de Crédito a SUNAT
 * @access Private
 */
export const reenviarNotaCredito = asyncHandler(async (req: RequestWithAuth, res: Response) => {
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
    const notaCredito = await notaCreditoModel.reenviarNotaCredito(tenantId, id);
    
    res.status(200).json({
      success: true,
      message: 'Nota de Crédito reenviada a SUNAT',
      data: notaCredito,
    });
  } catch (error: any) {
    if (error.code === 'NC_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Nota de Crédito no encontrada',
      });
      return;
    }
    
    if (error.code === 'NC_YA_ACEPTADA') {
      res.status(400).json({
        success: false,
        message: 'Esta Nota de Crédito ya fue aceptada por SUNAT',
      });
      return;
    }
    
    throw error;
  }
});
