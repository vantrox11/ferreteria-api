import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema, PaginationQuerySchema } from '../config/openapi-registry';
import { cantidadDecimalSchema, montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

// Alias para mantener compatibilidad semántica
const precioDecimalSchema = montoDecimalSchema;

/**
 * Schema para detalle de venta
 */
const DetalleVentaSchema = z.object({
  producto_id: z.number().int().positive('ID de producto requerido').openapi({
    description: 'ID del producto a vender',
    example: 1,
  }),
  cantidad: cantidadDecimalSchema.openapi({
    description: 'Cantidad vendida (máximo 3 decimales)',
    example: 2.5,
  }),
  precio_unitario: precioDecimalSchema.openapi({
    description: 'Precio final CON IGV por unidad (máximo 2 decimales)',
    example: 25.50,
  }),
});

/**
 * DTO para crear una nueva venta (POS)
 */
export const CreateVentaSchema = registry.register(
  'CreateVenta',
  z.object({
    cliente_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID del cliente (opcional para venta al público)',
      example: 1,
    }),
    tipo_comprobante: z.enum(['BOLETA', 'FACTURA']).optional().openapi({
      description: 'Tipo de comprobante (si se proporciona, sobrescribe la detección automática)',
      example: 'BOLETA',
    }),
    condicion_pago: z.enum(['CONTADO', 'CREDITO']).default('CONTADO').openapi({
      description: 'Condición de pago: CONTADO (pago inmediato) o CREDITO (pago diferido)',
      example: 'CONTADO',
    }),
    metodo_pago: z.string().max(100).optional().openapi({
      description: 'Método de pago utilizado (requerido si condicion_pago es CONTADO)',
      example: 'EFECTIVO',
    }),
    pago_inicial: montoDecimalSchema.optional().openapi({
      description: 'Monto del pago inicial (a cuenta) para ventas a CREDITO. Si se especifica, se crea un registro en tabla Pagos y el saldo_pendiente se reduce automáticamente.',
      example: 200.00,
    }),
    sesion_caja_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID de la sesión de caja asociada',
      example: 1,
    }),
    serie_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID de la serie de comprobante',
      example: 1,
    }),
    pedido_origen_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID del pedido que originó esta venta (si aplica)',
      example: 1,
    }),
    detalles: z.array(DetalleVentaSchema).min(1, 'Debe incluir al menos un producto en la venta').openapi({
      description: 'Detalles de los productos vendidos',
    }),
  })
);
export type CreateVentaDTO = z.infer<typeof CreateVentaSchema>;

/**
 * DTO para actualizar una venta existente
 */
export const UpdateVentaSchema = registry.register(
  'UpdateVenta',
  z.object({
    metodo_pago: z.string().max(100).optional().openapi({
      description: 'Método de pago',
      example: 'TARJETA',
    }),
  })
);
export type UpdateVentaDTO = z.infer<typeof UpdateVentaSchema>;

/**
 * Schema para detalle de venta en respuesta (VentaDetalles)
 * Campos según schema.prisma
 */
const DetalleVentaResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  producto_id: z.number().int().openapi({ example: 1 }),
  producto: z.object({
    id: z.number().int(),
    nombre: z.string(),
    sku: z.string().nullable(),
    unidad_medida: z.object({
      codigo: z.string(),
      nombre: z.string(),
    }).nullable().optional(),
  }).optional(),
  cantidad: z.number().openapi({ 
    description: 'Cantidad vendida (soporta decimales)',
    example: 2.5 
  }),
  valor_unitario: z.number().openapi({ 
    description: 'Precio sin IGV (snapshot fiscal)',
    example: 21.61 
  }),
  precio_unitario: z.number().openapi({ 
    description: 'Precio con IGV (snapshot fiscal)',
    example: 25.50 
  }),
  igv_total: z.number().openapi({ 
    description: 'Monto de IGV de esta línea',
    example: 9.72 
  }),
  tasa_igv: z.number().openapi({ 
    description: 'Tasa de IGV aplicada (ej: 18.00)',
    example: 18.00 
  }),
  tenant_id: z.number().int().openapi({ example: 1 }),
  venta_id: z.number().int().openapi({ example: 1 }),
});

/**
 * DTO de respuesta para venta (según schema.prisma: Ventas)
 */
export const VentaResponseSchema = registry.register(
  'Venta',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único de la venta',
      example: 1,
    }),
    total: z.number().openapi({
      description: 'Total de la venta',
      example: 63.75,
    }),
    metodo_pago: z.string().nullable().openapi({ 
      description: 'Método de pago utilizado',
      example: 'EFECTIVO' 
    }),
    condicion_pago: z.enum(['CONTADO', 'CREDITO']).openapi({ 
      description: 'Condición de pago',
      example: 'CONTADO' 
    }),
    estado_pago: z.enum(['PENDIENTE', 'PARCIAL', 'PAGADO']).openapi({ 
      description: 'Estado del pago',
      example: 'PAGADO' 
    }),
    fecha_vencimiento: z.string().datetime().nullable().openapi({
      description: 'Fecha de vencimiento (solo para crédito)',
      example: '2025-12-16T14:30:00Z',
    }),
    saldo_pendiente: z.number().openapi({
      description: 'Saldo pendiente de pago',
      example: 0.00,
    }),
    created_at: z.string().datetime().openapi({
      description: 'Fecha y hora de creación',
      example: '2025-11-16T14:30:00Z',
    }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    cliente_id: z.number().int().nullable().openapi({ example: 1 }),
    cliente: z.object({
      id: z.number().int(),
      nombre: z.string(),
      documento_identidad: z.string().nullable(),
      direccion: z.string().nullable().optional(),
    }).nullable().optional(),
    usuario_id: z.number().int().nullable().openapi({ example: 1 }),
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string().nullable(),
      email: z.string(),
    }).nullable().optional(),
    pedido_origen_id: z.number().int().nullable().openapi({ 
      description: 'ID del pedido que originó esta venta',
      example: 1 
    }),
    sesion_caja_id: z.number().int().nullable().openapi({ example: 1 }),
    serie_id: z.number().int().nullable().openapi({ 
      description: 'ID de la serie de comprobante SUNAT',
      example: 1 
    }),
    serie: z.object({
      id: z.number().int(),
      codigo: z.string(),
      tipo_comprobante: z.string(),
      correlativo_actual: z.number().int().optional(),
    }).nullable().optional().openapi({
      description: 'Datos de la serie SUNAT (expandido)',
    }),
    numero_comprobante: z.number().int().nullable().openapi({ 
      description: 'Número correlativo del comprobante',
      example: 123 
    }),
    estado_sunat: z.enum(['PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO']).nullable().openapi({
      description: 'Estado del comprobante en SUNAT',
      example: 'ACEPTADO',
    }),
    xml_url: z.string().nullable().openapi({
      description: 'URL del XML del comprobante electrónico',
      example: 'https://storage.com/xml/B001-123.xml',
    }),
    cdr_url: z.string().nullable().openapi({
      description: 'URL del CDR (Constancia de Recepción) de SUNAT',
      example: 'https://storage.com/cdr/R-B001-123.xml',
    }),
    hash_cpe: z.string().nullable().openapi({
      description: 'Hash del comprobante electrónico',
      example: 'abc123def456...',
    }),
    codigo_qr: z.string().nullable().openapi({
      description: 'Código QR del comprobante (URL o texto)',
      example: 'https://qr.sunat.gob.pe/...',
    }),
    detalles: z.array(DetalleVentaResponseSchema).optional().openapi({
      description: 'Detalles de los productos vendidos',
    }),
  })
);
export type VentaResponseDTO = z.infer<typeof VentaResponseSchema>;

/**
 * Query params para listar ventas (paginación + filtros)
 */
export const ListVentasQuerySchema = registry.register(
  'ListVentasQuery',
  PaginationQuerySchema.extend({
    q: z.string().optional().openapi({
      description: 'Búsqueda por cliente o método de pago',
      example: 'Juan',
    }),
    cliente_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de cliente',
      example: 1,
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango (ISO 8601)',
      example: '2025-11-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha fin del rango (ISO 8601)',
      example: '2025-11-30T23:59:59Z',
    }),
  })
);
export type ListVentasQueryDTO = z.infer<typeof ListVentasQuerySchema>;

/**
 * Schema de respuesta paginada para el listado de ventas
 */
export const PaginatedVentaResponseSchema = createPaginatedResponseSchema(
  VentaResponseSchema,
  'PaginatedVentaResponse'
);
