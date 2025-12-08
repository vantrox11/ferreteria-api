import { z } from 'zod';
import { RolUsuario } from '@prisma/client';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

// Enum de roles
export const RolUsuarioEnum = z.nativeEnum(RolUsuario);

/**
 * DTO para crear un nuevo usuario (empleado)
 */
export const CreateUsuarioSchema = registry.register(
  'CreateUsuario',
  z.object({
    email: z.string().email('El email es inválido').openapi({
      description: 'Email del usuario',
      example: 'empleado@empresa.com',
    }),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').openapi({
      description: 'Contraseña del usuario (mínimo 8 caracteres)',
      example: 'password123',
    }),
    nombre: z.string().min(1, 'El nombre es requerido').max(255).optional().openapi({
      description: 'Nombre completo del usuario',
      example: 'Juan Pérez',
    }),
    rol: RolUsuarioEnum.default(RolUsuario.empleado).openapi({
      description: 'Rol del usuario en el sistema',
      example: 'empleado',
    }),
  })
);
export type CreateUsuarioDTO = z.infer<typeof CreateUsuarioSchema>;

/**
 * DTO para actualizar un usuario existente
 */
export const UpdateUsuarioSchema = registry.register(
  'UpdateUsuario',
  z.object({
    email: z.string().email('El email es inválido').optional().openapi({
      description: 'Email del usuario',
      example: 'empleado@empresa.com',
    }),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional().openapi({
      description: 'Nueva contraseña del usuario (mínimo 8 caracteres)',
      example: 'newpassword123',
    }),
    nombre: z.string().max(255).optional().openapi({
      description: 'Nombre completo del usuario',
      example: 'Juan Pérez Actualizado',
    }),
    rol: RolUsuarioEnum.optional().openapi({
      description: 'Rol del usuario',
      example: 'admin',
    }),
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo (para borrado lógico)',
      example: true,
    }),
  })
);
export type UpdateUsuarioDTO = z.infer<typeof UpdateUsuarioSchema>;

/**
 * DTO de respuesta para usuario
 */
export const UsuarioResponseSchema = registry.register(
  'Usuario',
  z.object({
    id: z.number().int().positive().openapi({
      description: 'ID único del usuario',
      example: 1,
    }),
    email: z.string().email().openapi({
      description: 'Email del usuario',
      example: 'empleado@empresa.com',
    }),
    nombre: z.string().nullable().openapi({
      description: 'Nombre completo del usuario',
      example: 'Juan Pérez',
    }),
    rol: RolUsuarioEnum.openapi({
      description: 'Rol del usuario (admin, empleado)',
      example: 'empleado',
    }),
    isActive: z.boolean().openapi({
      description: 'Indica si el usuario está activo',
      example: true,
    }),
    tenant_id: z.number().int().positive().openapi({
      description: 'ID del tenant al que pertenece',
      example: 1,
    }),
  })
);
export type UsuarioResponseDTO = z.infer<typeof UsuarioResponseSchema>;
