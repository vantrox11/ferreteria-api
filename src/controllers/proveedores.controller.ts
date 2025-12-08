import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as proveedorModel from '../models/proveedor.model';
// Validación manejada por middleware validateRequest

/**
 * Obtiene todos los proveedores del tenant autenticado
 */
export const getProveedoresHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const proveedores = await proveedorModel.findAllProveedoresByTenant(tenantId);
    res.status(200).json({ data: proveedores });
  }
);

/**
 * Crea un nuevo proveedor para el tenant autenticado
 */
export const createProveedorHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    try {
      const nuevo = await proveedorModel.createProveedor(req.body, tenantId);
      res.status(201).json(nuevo);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'El RUC/identidad ya existe en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al crear proveedor.' });
    }
  }
);

/**
 * Obtiene un proveedor específico por id
 */
export const getProveedorByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const proveedor = await proveedorModel.findProveedorByIdAndTenant(tenantId, id);
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado.' });
      return;
    }
    res.status(200).json(proveedor);
  }
);

/**
 * Actualiza un proveedor por id
 */
export const updateProveedorHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);
    try {
      const updated = await proveedorModel.updateProveedorByIdAndTenant(
        tenantId,
        id,
        req.body
      );
      if (!updated) {
        res.status(404).json({ message: 'Proveedor no encontrado.' });
        return;
      }
      res.status(200).json(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'El RUC/identidad ya existe en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al actualizar proveedor.' });
    }
  }
);

/**
 * Desactiva un proveedor por id (borrado lógico)
 */
export const desactivarProveedorHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const deleted = await proveedorModel.desactivarProveedorByIdAndTenant(tenantId, id);
    if (!deleted) {
      res.status(404).json({ message: 'Proveedor no encontrado.' });
      return;
    }
    res.status(200).json({ message: 'Proveedor desactivado.' });
  }
);