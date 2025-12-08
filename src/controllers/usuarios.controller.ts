import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as usuarioModel from '../models/usuario.model';
import { CreateUsuarioSchema, UpdateUsuarioSchema } from '../dtos/usuario.dto';
import { IdParamSchema } from '../dtos/common.dto';

/**
 * Obtiene todos los usuarios (empleados) del tenant autenticado (solo activos)
 */
export const getUsuariosHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const usuarios = await usuarioModel.findAllUsuariosByTenant(tenantId);
    res.status(200).json({ data: usuarios });
  }
);

/**
 * Obtiene un usuario específico por id
 */
export const getUsuarioByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const usuario = await usuarioModel.findUsuarioByIdAndTenant(tenantId, Number(id));
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }
    res.status(200).json(usuario);
  }
);

/**
 * Crea un nuevo usuario (empleado) para el tenant autenticado
 */
export const createUsuarioHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;

    try {
      const { password, ...userData } = req.body;
      
      // Hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Crear usuario usando transacción
      const nuevoUsuario = await usuarioModel.createUsuario(
        {
          ...userData,
          nombre: userData.nombre ?? null,
          password_hash,
          isActive: true,
        },
        tenantId
      );

      res.status(201).json({
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'El email ya existe en este tenant.' });
        return;
      }
      console.error('Error al crear usuario:', error);
      res.status(500).json({ message: 'Error al crear usuario.' });
    }
  }
);

/**
 * Actualiza un usuario por id
 */
export const updateUsuarioHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    try {
      const { password, ...updateData } = req.body;
      
      // Si se proporciona una nueva contraseña, hashearla
      let dataToUpdate = { ...updateData };
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        (dataToUpdate as any).password_hash = password_hash;
      }

      const updated = await usuarioModel.updateUsuarioByIdAndTenant(
        tenantId,
        Number(id),
        dataToUpdate
      );
      
      if (!updated) {
        res.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }
      
      res.status(200).json(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ message: 'El email ya existe en este tenant.' });
        return;
      }
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ message: 'Error al actualizar usuario.' });
    }
  }
);

/**
 * Desactiva un usuario por id (borrado lógico)
 */
export const desactivarUsuarioHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    // No permitir que un usuario se desactive a sí mismo
    if (req.user?.id === Number(id)) {
      res.status(400).json({ message: 'No puedes desactivarte a ti mismo.' });
      return;
    }

    const updated = await usuarioModel.desactivarUsuarioByIdAndTenant(tenantId, Number(id));
    if (!updated) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }
    res.status(200).json({ message: 'Usuario desactivado.' });
  }
);
