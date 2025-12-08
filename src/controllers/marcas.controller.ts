import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as marcaModel from '../models/marca.model';
import { CreateMarcaSchema, UpdateMarcaSchema } from '../dtos/marca.dto';
import { IdParamSchema } from '../dtos/common.dto';

/**
 * GET /api/marcas — Lista todas las marcas del tenant con paginación
 */
export const getMarcasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Extraer parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100); // Entre 1 y 100
    const skip = (page - 1) * validLimit;
    
    // Obtener marcas paginadas
    const { total, data } = await marcaModel.findMarcasPaginadas(tenantId, {
      skip,
      take: validLimit,
    });
    
    // Devolver datos con metadatos de paginación
    res.status(200).json({
      data,
      meta: {
        total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  }
);

/**
 * GET /api/marcas/:id — Obtiene una marca por ID
 */
export const getMarcaByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const marca = await marcaModel.findMarcaByIdAndTenant(Number(id), tenantId);

    if (!marca) {
      res.status(404).json({ message: 'Marca no encontrada' });
      return;
    }

    res.status(200).json(marca);
  }
);

/**
 * POST /api/marcas — Crea una nueva marca
 */
export const createMarcaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    try {
      const nuevaMarca = await marcaModel.createMarca(req.body, tenantId);
      res.status(201).json(nuevaMarca);
    } catch (error: any) {
      if (error.message.includes('Ya existe')) {
        res.status(409).json({ message: error.message });
      } else {
        throw error;
      }
    }
  }
);

/**
 * PUT /api/marcas/:id — Actualiza una marca
 */
export const updateMarcaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    try {
      const marcaActualizada = await marcaModel.updateMarcaByIdAndTenant(
        Number(id),
        tenantId,
        req.body
      );
      res.status(200).json(marcaActualizada);
    } catch (error: any) {
      if (error.message === 'Marca no encontrada') {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('Ya existe')) {
        res.status(409).json({ message: error.message });
      } else {
        throw error;
      }
    }
  }
);

/**
 * PATCH /api/marcas/:id/desactivar — Desactiva una marca (borrado lógico)
 */
export const desactivarMarcaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    try {
      const resultado = await marcaModel.desactivarMarcaByIdAndTenant(Number(id), tenantId);
      
      let message = 'Marca desactivada correctamente';
      if (resultado.productosAfectados > 0) {
        message += `. Nota: ${resultado.productosAfectados} producto(s) tienen esta marca asignada.`;
      }

      res.status(200).json({ 
        message,
        marca: resultado.marca,
        productosAfectados: resultado.productosAfectados,
      });
    } catch (error: any) {
      if (error.message === 'Marca no encontrada') {
        res.status(404).json({ message: error.message });
      } else {
        throw error;
      }
    }
  }
);
