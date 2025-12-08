import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as categoriaModel from '../models/categoria.model';
import { CreateCategoriaSchema, UpdateCategoriaSchema } from '../dtos/categoria.dto';
import { IdParamSchema } from '../dtos/common.dto';

/**
 * Obtiene todas las categorías del tenant autenticado con paginación
 */
export const getCategoriasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Extraer parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100); // Entre 1 y 100
    const skip = (page - 1) * validLimit;
    
    // Obtener categorías paginadas
    const { total, data } = await categoriaModel.findCategoriasPaginadas(tenantId, {
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
 * Crea una nueva categoría para el tenant autenticado
 */
export const createCategoriaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    try {
      const nueva = await categoriaModel.createCategoria(req.body, tenantId);
      res.status(201).json(nueva);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ message: 'Ya existe una categoría con ese nombre en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al crear categoría.' });
    }
  }
);

/**
 * Obtiene una categoría específica por id
 */
export const getCategoriaByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const categoria = await categoriaModel.findCategoriaByIdAndTenant(tenantId, Number(id));
    if (!categoria) {
      res.status(404).json({ message: 'Categoría no encontrada.' });
      return;
    }
    res.status(200).json(categoria);
  }
);

/**
 * Actualiza una categoría por id
 */
export const updateCategoriaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    try {
      const updated = await categoriaModel.updateCategoriaByIdAndTenant(
        tenantId,
        Number(id),
        req.body
      );
      if (!updated) {
        res.status(404).json({ message: 'Categoría no encontrada.' });
        return;
      }
      res.status(200).json(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'Ya existe una categoría con ese nombre en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al actualizar categoría.' });
    }
  }
);

/**
 * Desactiva una categoría por id (borrado lógico)
 */
export const desactivarCategoriaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const deleted = await categoriaModel.desactivarCategoriaByIdAndTenant(tenantId, Number(id));
    if (!deleted) {
      res.status(404).json({ message: 'Categoría no encontrada.' });
      return;
    }
    res.status(200).json({ message: 'Categoría desactivada.' });
  }
);