import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as inventarioModel from '../models/inventario.model';
import { TipoAjuste } from '@prisma/client';
// Validación manejada por middleware validateRequest

/**
 * GET /api/inventario/ajustes — Lista ajustes de inventario con paginación, búsqueda y filtros
 */
export const getInventarioAjustesHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    // Parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.q as string) || '';
    
    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * validLimit;

    const filters = {
      skip,
      take: validLimit,
      search: search.trim() || undefined,
      producto_id: req.query.producto_id ? Number(req.query.producto_id) : undefined,
      tipo: req.query.tipo as TipoAjuste | undefined,
      fecha_inicio: req.query.fecha_inicio ? new Date(req.query.fecha_inicio as string) : undefined,
      fecha_fin: req.query.fecha_fin ? new Date(req.query.fecha_fin as string) : undefined,
    };

    const { total, data: ajustes } = await inventarioModel.findInventarioAjustesPaginados(tenantId, filters);

    const result = ajustes.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      cantidad: a.cantidad,
      motivo: a.motivo,
      created_at: a.created_at,
      producto: a.producto
        ? {
            id: a.producto.id,
            nombre: a.producto.nombre,
            sku: a.producto.sku,
            stock_actual: a.producto.stock,
          }
        : null,
      usuario: a.usuario
        ? { 
            id: a.usuario.id, 
            nombre: a.usuario.nombre || a.usuario.email || 'Usuario sin nombre'
          }
        : { id: 0, nombre: 'Sistema' },  // ✅ Mostrar "Sistema" cuando no hay usuario
    }));

    res.status(200).json({
      data: result,
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
 * GET /api/inventario/ajustes/:id — Obtiene el detalle de un ajuste específico
 */
export const getInventarioAjusteByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const ajuste = await inventarioModel.findInventarioAjusteByIdAndTenant(
      tenantId,
      id
    );
    if (!ajuste) {
      res.status(404).json({ message: 'Ajuste de inventario no encontrado.' });
      return;
    }

    res.status(200).json({
      id: ajuste.id,
      tipo: ajuste.tipo,
      cantidad: ajuste.cantidad,
      motivo: ajuste.motivo,
      created_at: ajuste.created_at,
      producto: ajuste.producto
        ? {
            id: ajuste.producto.id,
            nombre: ajuste.producto.nombre,
            sku: ajuste.producto.sku,
            stock_actual: ajuste.producto.stock,
          }
        : null,
      usuario: ajuste.usuario
        ? {
            id: ajuste.usuario.id,
            nombre: ajuste.usuario.nombre,
            email: ajuste.usuario.email,
          }
        : null,
    });
  }
);

/**
 * POST /api/inventario/ajustes — Crea un nuevo ajuste de inventario
 * Actualiza automáticamente el stock del producto
 */
export const createInventarioAjusteHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const usuarioId = req.user?.id;

    try {
      const nuevoAjuste = await inventarioModel.createInventarioAjuste(
        req.body,
        tenantId,
        usuarioId
      );
      res.status(201).json({
        id: nuevoAjuste.id,
        tipo: nuevoAjuste.tipo,
        cantidad: nuevoAjuste.cantidad,
        motivo: nuevoAjuste.motivo,
        created_at: nuevoAjuste.created_at,
        producto_id: nuevoAjuste.producto_id,
      });
    } catch (error: any) {
      if (error?.code === 'PRODUCTO_NOT_FOUND') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error?.code === 'STOCK_INSUFICIENTE') {
        res.status(409).json({ message: error.message });
        return;
      }
      console.error('Error al crear ajuste de inventario:', error);
      res.status(500).json({ message: 'Error al crear ajuste de inventario.' });
    }
  }
);

/**
 * DELETE /api/inventario/ajustes/:id — Elimina un ajuste de inventario
 * NOTA: No reversa automáticamente el stock. Usar con precaución.
 */
export const deleteInventarioAjusteHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const deleted = await inventarioModel.deleteInventarioAjusteByIdAndTenant(
      tenantId,
      id
    );
    if (!deleted) {
      res.status(404).json({ message: 'Ajuste de inventario no encontrado.' });
      return;
    }

    res.status(200).json({
      message: 'Ajuste de inventario eliminado. NOTA: El stock NO fue reversado automáticamente.',
    });
  }
);
