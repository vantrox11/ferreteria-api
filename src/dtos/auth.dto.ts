import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * DTO para registrar un nuevo tenant con su usuario admin
 */
export const RegisterTenantSchema = registry.register(
  'RegisterTenant',
  z.object({
    nombre_empresa: z.string().min(1, 'Nombre de empresa es requerido').openapi({
      description: 'Nombre de la empresa/tenant',
      example: 'Ferretería El Tornillo',
    }),
    subdominio: z
      .string()
      .min(3, 'Subdominio debe tener al menos 3 caracteres')
      .regex(/^[a-z0-9-]+$/, 'Subdominio solo permite minúsculas, números y guiones')
      .openapi({
        description: 'Subdominio único para el tenant',
        example: 'el-tornillo',
      }),
    email: z.string().email('Email inválido').openapi({
      description: 'Email del usuario administrador',
      example: 'admin@eltornillo.com',
    }),
    password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres').openapi({
      description: 'Contraseña para el usuario administrador',
      example: 'SecurePass123!',
    }),
  })
);

export type RegisterTenantDTO = z.infer<typeof RegisterTenantSchema>;

/**
 * DTO para login de usuario
 */
export const LoginSchema = registry.register(
  'Login',
  z.object({
    email: z.string().email('Email inválido').openapi({
      description: 'Email del usuario',
      example: 'admin@eltornillo.com',
    }),
    password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres').openapi({
      description: 'Contraseña del usuario',
      example: 'SecurePass123!',
    }),
  })
);

export type LoginDTO = z.infer<typeof LoginSchema>;

/**
 * DTO para verificar un tenant (activación)
 */
export const VerifyTenantSchema = registry.register(
  'VerifyTenant',
  z
    .object({
      tenantId: z.number().int().optional().openapi({
        description: 'ID del tenant a verificar',
        example: 1,
      }),
      subdominio: z.string().min(1).optional().openapi({
        description: 'Subdominio del tenant a verificar',
        example: 'el-tornillo',
      }),
    })
    .refine((data) => data.tenantId || data.subdominio, {
      message: 'Se requiere tenantId o subdominio.',
      path: ['tenantId', 'subdominio'],
    })
);

export type VerifyTenantDTO = z.infer<typeof VerifyTenantSchema>;

/**
 * DTO de respuesta para login exitoso
 */
export const LoginResponseSchema = registry.register(
  'LoginResponse',
  z.object({
    token: z.string().openapi({
      description: 'JWT token de autenticación',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    user: z.object({
      id: z.number().int().openapi({ example: 1 }),
      email: z.string().openapi({ example: 'admin@eltornillo.com' }),
      nombre: z.string().nullable().openapi({ example: 'Admin' }),
      rol: z.string().openapi({ example: 'admin' }),
    }).openapi({
      description: 'Información del usuario autenticado',
    }),
    tenant: z.object({
      id: z.number().int().openapi({ example: 1 }),
      nombre_empresa: z.string().openapi({ example: 'Ferretería El Tornillo' }),
      subdominio: z.string().openapi({ example: 'el-tornillo' }),
    }).openapi({
      description: 'Información del tenant',
    }),
  })
);

export type LoginResponseDTO = z.infer<typeof LoginResponseSchema>;

/**
 * DTO de respuesta para registro exitoso
 */
export const RegisterResponseSchema = registry.register(
  'RegisterResponse',
  z.object({
    message: z.string().openapi({
      example: 'Tenant registrado exitosamente. Requiere activación manual en desarrollo.',
    }),
    tenant: z.object({
      id: z.number().int().openapi({ example: 1 }),
      nombre_empresa: z.string().openapi({ example: 'Ferretería El Tornillo' }),
      subdominio: z.string().openapi({ example: 'el-tornillo' }),
      isActive: z.boolean().openapi({ 
        example: false,
        description: 'Indica si el tenant está activo (requiere verificación manual en dev)'
      }),
    }),
  })
);

export type RegisterResponseDTO = z.infer<typeof RegisterResponseSchema>;