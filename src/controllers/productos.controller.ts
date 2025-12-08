import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as productoModel from '../models/producto.model';
import { CreateProductoSchema, UpdateProductoSchema } from '../dtos/producto.dto';
import { IdParamSchema } from '../dtos/common.dto';

/**
 * Obtiene todos los productos del tenant autenticado con paginación y búsqueda
 */
export const getProductosHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Extraer parámetros de paginación y búsqueda
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.q as string) || '';
    
    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100); // Entre 1 y 100
    const skip = (page - 1) * validLimit;
    
    // Obtener productos paginados
    const { total, data } = await productoModel.findProductosPaginados(tenantId, {
      skip,
      take: validLimit,
      search: search.trim() || undefined,
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
 * Crea un nuevo producto para el tenant autenticado
 */
export const createProductoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    try {
      const nuevoProducto = await productoModel.createProducto(req.body, tenantId);
      res.status(201).json(nuevoProducto);
    } catch (error: any) {
      if (error?.code === 'TENANT_MISMATCH') {
        res.status(403).json({ message: 'La categoría no pertenece a este tenant.' });
        return;
      }
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'SKU ya existe en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al crear producto.' });
    }
  }
);

/**
 * Obtiene un producto específico por id
 */
export const getProductoByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const producto = await productoModel.findProductoByIdAndTenant(tenantId, Number(id));
    if (!producto) {
      res.status(404).json({ message: 'Producto no encontrado.' });
      return;
    }
    res.status(200).json(producto);
  }
);

/**
 * Actualiza un producto por id
 */
export const updateProductoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    try {
      const updated = await productoModel.updateProductoByIdAndTenant(
        tenantId,
        Number(id),
        req.body
      );
      if (!updated) {
        res.status(404).json({ message: 'Producto no encontrado.' });
        return;
      }
      res.status(200).json(updated);
    } catch (error: any) {
      if (error?.code === 'TENANT_MISMATCH') {
        res.status(403).json({ message: 'La categoría no pertenece a este tenant.' });
        return;
      }
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'SKU ya existe en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al actualizar producto.' });
    }
  }
);

/**
 * Desactiva un producto por id (borrado lógico)
 */
export const desactivarProductoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const deleted = await productoModel.desactivarProductoByIdAndTenant(tenantId, Number(id));
    if (!deleted) {
      res.status(404).json({ message: 'Producto no encontrado.' });
      return;
    }
    res.status(200).json({ message: 'Producto desactivado.' });
  }
);