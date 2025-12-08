import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as unidadMedidaModel from '../models/unidad-medida.model';
import { CreateUnidadMedidaSchema, UpdateUnidadMedidaSchema } from '../dtos/unidad-medida.dto';
import { IdParamSchema } from '../dtos/common.dto';
import { UNIDADES_MEDIDA_SUNAT, obtenerUnidadesPorCategoria } from '../config/catalogo-sunat';
import { type Request } from 'express';

/**
 * GET /api/unidades-medida/catalogo-sunat — Catálogo completo de SUNAT (público)
 * No requiere autenticación - útil para que el frontend muestre opciones válidas
 */
export const getCatalogoSUNATHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoria } = req.query;

    // Si se especifica una categoría, filtrar
    if (categoria && typeof categoria === 'string') {
      const categoriaUpper = categoria.toUpperCase() as any;
      const unidadesFiltradas = obtenerUnidadesPorCategoria(categoriaUpper);
      
      if (unidadesFiltradas.length === 0) {
        res.status(400).json({ 
          message: 'Categoría inválida',
          categoriasDisponibles: ['BASICA', 'MASA', 'LONGITUD', 'AREA', 'VOLUMEN', 'EMBALAJE', 'ESPECIAL']
        });
        return;
      }

      res.status(200).json({
        total: unidadesFiltradas.length,
        categoria: categoriaUpper,
        unidades: unidadesFiltradas
      });
      return;
    }

    // Retornar catálogo completo
    res.status(200).json({
      total: UNIDADES_MEDIDA_SUNAT.length,
      normativa: 'Resolución de Superintendencia N° 097-2012/SUNAT - Catálogo 03',
      referencia: 'https://cpe.sunat.gob.pe/node/88',
      unidades: UNIDADES_MEDIDA_SUNAT
    });
  }
);

/**
 * GET /api/unidades-medida — Lista todas las unidades del tenant con paginación
 */
export const getUnidadesMedidaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Extraer parámetros de paginación preservando explícitamente el valor 0 para "sin límite"
    const rawPage = Number.parseInt(req.query.page as string);
    const rawLimit = Number.parseInt(req.query.limit as string);
    const page = Number.isNaN(rawPage) ? 1 : rawPage;
    const limit = Number.isNaN(rawLimit) ? 10 : rawLimit;
    
    // Si limit es 0 o negativo, devolver todos los registros sin paginar
    if (limit <= 0) {
      const { total, data } = await unidadMedidaModel.findUnidadesPaginadas(tenantId, {
        skip: 0,
        take: undefined, // Sin límite
      });
      
      res.status(200).json({
        data,
        meta: {
          total,
          page: 1,
          limit: total,
          totalPages: 1,
        },
      });
      return;
    }
    
    // Validar límites razonables para paginación normal
    const validLimit = Math.min(Math.max(limit, 1), 100); // Entre 1 y 100
    const skip = (page - 1) * validLimit;
    
    // Obtener unidades paginadas
    const { total, data } = await unidadMedidaModel.findUnidadesPaginadas(tenantId, {
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
 * GET /api/unidades-medida/:id — Obtiene una unidad de medida por ID
 */
export const getUnidadMedidaByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const unidad = await unidadMedidaModel.findUnidadByIdAndTenant(Number(id), tenantId);

    if (!unidad) {
      res.status(404).json({ message: 'Unidad de medida no encontrada' });
      return;
    }

    res.status(200).json(unidad);
  }
);

/**
 * POST /api/unidades-medida — Crea una nueva unidad de medida
 */
export const createUnidadMedidaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    try {
      const nuevaUnidad = await unidadMedidaModel.createUnidadMedida(req.body, tenantId);
      res.status(201).json(nuevaUnidad);
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
 * PUT /api/unidades-medida/:id — Actualiza una unidad de medida
 */
export const updateUnidadMedidaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    try {
      const unidadActualizada = await unidadMedidaModel.updateUnidadByIdAndTenant(
        Number(id),
        tenantId,
        req.body
      );
      res.status(200).json(unidadActualizada);
    } catch (error: any) {
      if (error.message === 'Unidad de medida no encontrada') {
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
 * DELETE /api/unidades-medida/:id — Elimina una unidad de medida
 */
export const deleteUnidadMedidaHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    try {
      await unidadMedidaModel.deleteUnidadByIdAndTenant(Number(id), tenantId);
      res.status(200).json({ message: 'Unidad de medida eliminada correctamente' });
    } catch (error: any) {
      if (error.message === 'Unidad de medida no encontrada') {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('está siendo utilizada')) {
        res.status(409).json({ message: error.message });
      } else {
        throw error;
      }
    }
  }
);
