import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema } from '../config/openapi-registry';

extendZodWithOpenApi(z);

export const CreateClienteSchema = registry.register(
  'CreateCliente',
  z.object({
    nombre: z.string().min(1, 'El nombre es requerido').openapi({
      description: 'Nombre o razón social del cliente',
      example: 'Juan Pérez',
    }),
    documento_identidad: z.string()
      .regex(/^[0-9]{8}$|^[0-9]{11}$/, 'El DNI debe tener 8 dígitos o el RUC 11 dígitos')
      .optional()
      .openapi({
        description: 'DNI (8 dígitos) o RUC (11 dígitos) del cliente',
        example: '12345678',
        pattern: '^[0-9]{8}$|^[0-9]{11}$'
      }),
    ruc: z.string()
      .regex(/^[0-9]{11}$/, 'El RUC debe tener 11 dígitos')
      .optional()
      .openapi({
        description: 'RUC del cliente (opcional, para facturación)',
        example: '20123456789',
        pattern: '^[0-9]{11}$'
      }),
    razon_social: z.string()
      .min(1)
      .optional()
      .openapi({
        description: 'Razón Social del cliente (opcional, requerido si tiene RUC)',
        example: 'Corporación ABC S.A.C.',
      }),
    email: z.string().email('El email es inválido').optional().openapi({
      description: 'Email del cliente',
      example: 'juan.perez@email.com',
    }),
    telefono: z.string().optional().openapi({
      description: 'Teléfono del cliente',
      example: '987654321',
    }),
    direccion: z.string().optional().openapi({
      description: 'Dirección del cliente',
      example: 'Av. Los Proceres 123, Lima',
    }),
    dias_credito: z.number().int().min(0).optional().default(0).openapi({
      description: 'Días de crédito otorgados al cliente (0 = contado)',
      example: 30,
    }),
    limite_credito: z.number().min(0).optional().default(0).openapi({
      description: 'Límite de crédito en soles (0 = sin crédito)',
      example: 5000.00,
    }),
  }).refine(
    (data) => {
      // Si tiene RUC, debe tener razón social
      if (data.ruc && !data.razon_social) {
        return false;
      }
      return true;
    },
    {
      message: 'Si proporciona RUC, debe incluir la Razón Social',
      path: ['razon_social']
    }
  )
);

export type CreateClienteDTO = z.infer<typeof CreateClienteSchema>;

export const UpdateClienteSchema = registry.register(
  'UpdateCliente',
  CreateClienteSchema.partial().extend({
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo (para borrado lógico)',
      example: true,
    }),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo a actualizar' }
  )
);

export type UpdateClienteDTO = z.infer<typeof UpdateClienteSchema>;

export const ClienteResponseSchema = registry.register(
  'Cliente',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del cliente',
      example: 1,
    }),
    nombre: z.string().openapi({
      example: 'Juan Pérez',
    }),
    documento_identidad: z.string().nullable().openapi({
      example: '12345678',
    }),
    ruc: z.string().nullable().openapi({
      description: 'RUC del cliente (para facturación)',
      example: '20123456789',
    }),
    razon_social: z.string().nullable().openapi({
      description: 'Razón Social (requerido si tiene RUC)',
      example: 'INVERSIONES PEREZ S.A.C.',
    }),
    email: z.string().nullable().openapi({
      example: 'juan.perez@email.com',
    }),
    telefono: z.string().nullable().openapi({
      example: '987654321',
    }),
    direccion: z.string().nullable().openapi({
      example: 'Av. Los Proceres 123, Lima',
    }),
    dias_credito: z.number().int().openapi({
      description: 'Días de crédito otorgados (0 = contado)',
      example: 30,
    }),
    limite_credito: z.number().openapi({
      description: 'Límite de crédito en soles',
      example: 5000.00,
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

export type ClienteResponseDTO = z.infer<typeof ClienteResponseSchema>;

/**
 * Schema de respuesta paginada para el listado de clientes
 */
export const PaginatedClienteResponseSchema = createPaginatedResponseSchema(
  ClienteResponseSchema,
  'PaginatedClienteResponse'
);