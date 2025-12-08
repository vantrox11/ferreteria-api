import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';
import { cantidadDecimalSchema, montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

// Alias para mantener compatibilidad semántica
const costoDecimalSchema = montoDecimalSchema;

/**
 * Enum para estado de orden de compra
 */
export const EstadoOrdenCompraEnum = z.enum(['pendiente', 'recibida', 'cancelada']);
export type EstadoOrdenCompraType = z.infer<typeof EstadoOrdenCompraEnum>;

/**
 * Enum para tipo de comprobante de compra (FASE 2.1)
 */
export const TipoComprobanteCompraEnum = z.enum(['FACTURA', 'BOLETA', 'GUIA']);
export type TipoComprobanteCompraType = z.infer<typeof TipoComprobanteCompraEnum>;

/**
 * Schema para detalle de orden de compra
 */
const DetalleOrdenCompraSchema = z.object({
  producto_id: z.number().int().positive('ID de producto requerido').openapi({
    description: 'ID del producto a comprar',
    example: 1,
  }),
  cantidad: cantidadDecimalSchema.openapi({
    description: 'Cantidad a ordenar (máximo 3 decimales)',
    example: 50,
  }),
  costo_unitario: costoDecimalSchema.openapi({
    description: 'Costo unitario CON IGV incluido (máximo 2 decimales)',
    example: 23.60,
  }),
});

/**
 * DTO para crear una nueva orden de compra (ACTUALIZADO FASE 2.1)
 */
export const CreateOrdenCompraSchema = registry.register(
  'CreateOrdenCompra',
  z.object({
    proveedor_id: z.number().int().positive().openapi({
      description: 'ID del proveedor (ahora obligatorio)',
      example: 1,
    }),
    tipo_comprobante: TipoComprobanteCompraEnum.optional().openapi({
      description: 'Tipo de comprobante (opcional en creación, obligatorio en recepción)',
      example: 'FACTURA',
    }),
    serie: z.string().max(10).optional().openapi({
      description: 'Serie del comprobante del proveedor (opcional en creación)',
      example: 'F005',
    }),
    numero: z.string().max(20).optional().openapi({
      description: 'Número del comprobante del proveedor (opcional en creación)',
      example: '000345',
    }),
    fecha_emision: z.string().datetime().optional().openapi({
      description: 'Fecha de emisión del comprobante',
      example: '2025-11-21T10:30:00Z',
    }),
    detalles: z.array(DetalleOrdenCompraSchema).min(1, 'Debe incluir al menos un producto en la orden de compra').openapi({
      description: 'Detalles de los productos a ordenar (costos con IGV incluido)',
    }),
  })
);
export type CreateOrdenCompraDTO = z.infer<typeof CreateOrdenCompraSchema>;

/**
 * DTO para actualizar una orden de compra existente
 */
export const UpdateOrdenCompraSchema = registry.register(
  'UpdateOrdenCompra',
  z.object({
    proveedor_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID del proveedor (opcional)',
      example: 1,
    }),
    estado: EstadoOrdenCompraEnum.optional().openapi({
      description: 'Estado de la orden',
      example: 'pendiente',
    }),
  })
);
export type UpdateOrdenCompraDTO = z.infer<typeof UpdateOrdenCompraSchema>;

/**
 * DTO para registrar la recepción de una orden de compra (ACTUALIZADO FASE 2.1)
 */
export const RecibirOrdenCompraSchema = registry.register(
  'RecibirOrdenCompra',
  z.object({
    serie: z.string().min(1, 'Serie del comprobante es obligatoria').max(10).openapi({
      description: 'Serie del comprobante del proveedor',
      example: 'F005',
    }),
    numero: z.string().min(1, 'Número del comprobante es obligatorio').max(20).openapi({
      description: 'Número del comprobante del proveedor',
      example: '000345',
    }),
    fecha_recepcion: z.string().datetime().optional().openapi({
      description: 'Fecha de recepción (si no se proporciona, usa fecha actual)',
      example: '2025-11-21T10:30:00Z',
    }),
  })
);
export type RecibirOrdenCompraDTO = z.infer<typeof RecibirOrdenCompraSchema>;

/**
 * Schema para detalle de orden en respuesta (OrdenCompraDetalles)
 */
const DetalleOrdenCompraResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  cantidad: z.number().openapi({ 
    description: 'Cantidad ordenada (soporta decimales)',
    example: 50 
  }),
  costo_unitario: z.number().openapi({ example: 15.50 }),
  tenant_id: z.number().int().openapi({ example: 1 }),
  orden_compra_id: z.number().int().openapi({ example: 1 }),
  producto_id: z.number().int().openapi({ example: 1 }),
  producto: z.object({
    id: z.number().int(),
    nombre: z.string(),
    sku: z.string().nullable(),
  }).optional(),
});

/**
 * DTO de respuesta para orden de compra (ACTUALIZADO FASE 2.1)
 */
export const OrdenCompraResponseSchema = registry.register(
  'OrdenCompra',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la orden de compra',
      example: 1,
    }),
    total: z.number().nullable().openapi({
      description: 'Total de la orden CON IGV',
      example: 1180.00,
    }),
    subtotal_base: z.number().nullable().openapi({
      description: 'Subtotal SIN IGV',
      example: 1000.00,
    }),
    impuesto_igv: z.number().nullable().openapi({
      description: 'Monto total de IGV',
      example: 180.00,
    }),
    tipo_comprobante: z.string().nullable().openapi({
      description: 'Tipo de comprobante',
      example: 'FACTURA',
    }),
    serie: z.string().nullable().openapi({
      description: 'Serie del comprobante',
      example: 'F005',
    }),
    numero: z.string().nullable().openapi({
      description: 'Número del comprobante',
      example: '000345',
    }),
    fecha_emision: z.string().datetime().nullable().openapi({
      description: 'Fecha de emisión del comprobante',
      example: '2025-11-21T10:30:00Z',
    }),
    proveedor_ruc: z.string().nullable().openapi({
      description: 'RUC del proveedor (snapshot)',
      example: '20123456789',
    }),
    estado: EstadoOrdenCompraEnum.openapi({
      description: 'Estado de la orden',
      example: 'pendiente',
    }),
    fecha_creacion: z.string().datetime().openapi({
      description: 'Fecha de creación de la orden',
      example: '2025-11-16T10:30:00Z',
    }),
    fecha_recepcion: z.string().datetime().nullable().openapi({
      description: 'Fecha en que se recibió la mercadería',
      example: '2025-11-17T14:00:00Z',
    }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    proveedor_id: z.number().int().nullable().openapi({ example: 1 }),
    proveedor: z.object({
      id: z.number().int(),
      nombre: z.string(),
      ruc_identidad: z.string(),
      tipo_documento: z.string(),
    }).nullable().optional(),
    usuario_id: z.number().int().nullable().openapi({ 
      description: 'Usuario que creó la orden',
      example: 1 
    }),
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string().nullable(),
      email: z.string(),
    }).nullable().optional(),
    detalles: z.array(DetalleOrdenCompraResponseSchema).optional().openapi({
      description: 'Detalles de los productos ordenados',
    }),
  })
);
export type OrdenCompraResponseDTO = z.infer<typeof OrdenCompraResponseSchema>;

/**
 * Query params para listar órdenes de compra
 */
export const ListOrdenesCompraQuerySchema = registry.register(
  'ListOrdenesCompraQuery',
  z.object({
    proveedor_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de proveedor',
      example: 1,
    }),
    estado: EstadoOrdenCompraEnum.optional().openapi({
      description: 'Filtrar por estado de orden',
      example: 'pendiente',
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango (ISO 8601)',
      example: '2025-11-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha de fin del rango (ISO 8601)',
      example: '2025-11-30T23:59:59Z',
    }),
  })
);
export type ListOrdenesCompraQueryDTO = z.infer<typeof ListOrdenesCompraQuerySchema>;
