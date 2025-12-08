import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * DTO para crear un nuevo proveedor
 */
export const CreateProveedorSchema = registry.register(
  'CreateProveedor',
  z.object({
    nombre: z.string().min(1, 'El nombre es requerido').openapi({
      description: 'Nombre o razón social del proveedor',
      example: 'Distribuidora ABC S.A.C.',
    }),
    tipo_documento: z.enum(['RUC', 'DNI', 'CE']).openapi({
      description: 'Tipo de documento de identidad del proveedor',
      example: 'RUC',
    }),
    ruc_identidad: z.string()
      .min(1, 'El documento de identidad es requerido')
      .openapi({
        description: 'Número de documento: RUC (11 dígitos), DNI (8 dígitos) o CE',
        example: '20123456789',
      }),
    email: z.string().email('El email es inválido').optional().openapi({
      description: 'Email de contacto del proveedor',
      example: 'ventas@distribuidoraabc.com',
    }),
    telefono: z.string().optional().openapi({
      description: 'Teléfono del proveedor',
      example: '01-2345678',
    }),
    direccion: z.string().optional().openapi({
      description: 'Dirección del proveedor',
      example: 'Av. Industrial 456, Lima',
    }),
  })
);

export type CreateProveedorDTO = z.infer<typeof CreateProveedorSchema>;

/**
 * DTO para actualizar un proveedor existente
 */
export const UpdateProveedorSchema = registry.register(
  'UpdateProveedor',
  CreateProveedorSchema.partial().extend({
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo (para borrado lógico)',
      example: true,
    }),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo a actualizar' }
  )
);

export type UpdateProveedorDTO = z.infer<typeof UpdateProveedorSchema>;

/**
 * DTO de respuesta para proveedor
 */
export const ProveedorResponseSchema = registry.register(
  'Proveedor',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del proveedor',
      example: 1,
    }),
    nombre: z.string().openapi({
      example: 'Distribuidora ABC S.A.C.',
    }),
    tipo_documento: z.enum(['RUC', 'DNI', 'CE']).openapi({
      description: 'Tipo de documento de identidad',
      example: 'RUC',
    }),
    ruc_identidad: z.string().nullable().openapi({
      example: '20123456789',
    }),
    email: z.string().nullable().openapi({
      example: 'ventas@distribuidoraabc.com',
    }),
    telefono: z.string().nullable().openapi({
      example: '01-2345678',
    }),
    direccion: z.string().nullable().openapi({
      example: 'Av. Industrial 456, Lima',
    }),
    isActive: z.boolean().openapi({
      description: 'Estado activo/inactivo',
      example: true,
    }),
    tenant_id: z.number().int().openapi({
      example: 1,
    }),
  })
);

export type ProveedorResponseDTO = z.infer<typeof ProveedorResponseSchema>;