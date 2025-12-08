import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as clienteModel from '../models/cliente.model';
import { CreateClienteSchema, UpdateClienteSchema } from '../dtos/cliente.dto';
import { IdParamSchema } from '../dtos/common.dto';

/**
 * Obtiene todos los clientes del tenant autenticado con paginación y búsqueda
 */
export const getClientesHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Extraer parámetros de paginación y búsqueda
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.q as string) || '';
    
    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * validLimit;
    
    // Obtener clientes paginados
    const { total, data } = await clienteModel.findClientesPaginados(tenantId, {
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
 * Crea un nuevo cliente para el tenant autenticado
 */
export const createClienteHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    console.log('📝 [CREATE CLIENTE] Datos recibidos:', JSON.stringify(req.body, null, 2));

    try {
      const nuevo = await clienteModel.createCliente(req.body, tenantId);
      res.status(201).json(nuevo);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'El documento de identidad ya existe en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al crear cliente.' });
    }
  }
);

/**
 * Obtiene un cliente específico por id
 */
export const getClienteByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const cliente = await clienteModel.findClienteByIdAndTenant(tenantId, id);
    if (!cliente) {
      res.status(404).json({ message: 'Cliente no encontrado.' });
      return;
    }
    res.status(200).json(cliente);
  }
);

/**
 * Actualiza un cliente por id
 */
export const updateClienteHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    try {
      const updated = await clienteModel.updateClienteByIdAndTenant(
        tenantId,
        id,
        req.body
      );
      if (!updated) {
        res.status(404).json({ message: 'Cliente no encontrado.' });
        return;
      }
      res.status(200).json(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'El documento de identidad ya existe en este tenant.' });
        return;
      }
      res.status(500).json({ message: 'Error al actualizar cliente.' });
    }
  }
);

/**
 * Desactiva un cliente por id (borrado lógico)
 */
export const desactivarClienteHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    const deleted = await clienteModel.desactivarClienteByIdAndTenant(tenantId, id);
    if (!deleted) {
      res.status(404).json({ message: 'Cliente no encontrado.' });
      return;
    }
    res.status(200).json({ message: 'Cliente desactivado.' });
  }
);