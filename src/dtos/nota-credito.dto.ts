import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema, PaginationQuerySchema } from '../config/openapi-registry';
import { cantidadDecimalSchema, montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * Enum de Tipos de Nota de Crédito según SUNAT
 */
export const TipoNotaCreditoEnum = z.enum([
  'ANULACION_DE_LA_OPERACION',
  'ANULACION_POR_ERROR_EN_EL_RUC',
  'CORRECCION_POR_ERROR_EN_LA_DESCRIPCION',
  'DESCUENTO_GLOBAL',
  'DEVOLUCION_TOTAL',
  'DEVOLUCION_PARCIAL',
  'OTROS',
]);

/**
 * Enum de Estados SUNAT
 */
export const EstadoSunatEnum = z.enum([
  'PENDIENTE',
  'ACEPTADO',
  'RECHAZADO',
  'OBSERVADO',
]);

/**
 * Schema para detalle de Nota de Crédito
 */
const DetalleNotaCreditoSchema = z.object({
  producto_id: z.number().int().positive('ID de producto requerido').openapi({
    description: 'ID del producto que se devuelve o anula',
    example: 1,
  }),
  cantidad: cantidadDecimalSchema.openapi({
    description: 'Cantidad del producto (máximo 3 decimales)',
    example: 2.0,
  }),
  precio_unitario: montoDecimalSchema.openapi({
    description: 'Precio unitario CON IGV (debe coincidir con el de la venta original)',
    example: 25.50,
  }),
});

/**
 * DTO para crear una Nota de Crédito
 */
export const CreateNotaCreditoSchema = registry.register(
  'CreateNotaCredito',
  z.object({
    venta_referencia_id: z.number().int().positive('ID de venta requerido').openapi({
      description: 'ID de la venta que se anula o corrige',
      example: 123,
    }),
    tipo_nota: TipoNotaCreditoEnum.openapi({
      description: 'Tipo de Nota de Crédito según catálogo SUNAT',
      example: 'DEVOLUCION_TOTAL',
    }),
    motivo_sustento: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500).openapi({
      description: 'Sustento detallado del motivo de la Nota de Crédito',
      example: 'Cliente devuelve mercadería por producto defectuoso',
    }),
    devolver_stock: z.boolean().default(true).openapi({
      description: 'Si es true, el sistema incrementará el stock de los productos. Solo aplica para devoluciones',
      example: true,
    }),
    devolver_efectivo: z.boolean().default(true).openapi({
      description: 'Si es true, crea automáticamente un egreso de caja (solo aplica para ventas CONTADO)',
      example: true,
    }),
    sesion_caja_id: z.number().int().positive().optional().openapi({
      description: 'ID de la sesión de caja para registrar el egreso. Requerido si devolver_efectivo=true',
      example: 1,
    }),
    detalles: z.array(DetalleNotaCreditoSchema).min(1, 'Debe incluir al menos un producto').openapi({
      description: 'Detalles de los productos afectados por la NC',
    }),
  }).refine(
    (data) => !data.devolver_efectivo || data.sesion_caja_id !== undefined,
    {
      message: 'sesion_caja_id es requerido cuando devolver_efectivo es true',
      path: ['sesion_caja_id'],
    }
  )
);
export type CreateNotaCreditoDTO = z.infer<typeof CreateNotaCreditoSchema>;

/**
 * Schema de respuesta para detalle de Nota de Crédito
 */
export const NotaCreditoDetalleResponseSchema = registry.register(
  'NotaCreditoDetalle',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    producto_id: z.number().int().openapi({ example: 1 }),
    cantidad: z.number().openapi({ example: 2.0 }),
    valor_unitario: z.number().openapi({
      description: 'Precio sin IGV',
      example: 21.61
    }),
    precio_unitario: z.number().openapi({
      description: 'Precio con IGV',
      example: 25.50
    }),
    igv_total: z.number().openapi({ example: 3.89 }),
    tasa_igv: z.number().openapi({ example: 0.18 }),
    producto: z.object({
      id: z.number().int(),
      nombre: z.string(),
      sku: z.string().nullable(),
    }).optional().openapi({
      description: 'Datos del producto',
    }),
  })
);
export type NotaCreditoDetalleResponseDTO = z.infer<typeof NotaCreditoDetalleResponseSchema>;

/**
 * Schema de respuesta para Nota de Crédito
 */
export const NotaCreditoResponseSchema = registry.register(
  'NotaCredito',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    serie: z.object({
      id: z.number().int(),
      codigo: z.string(),
      tipo_comprobante: z.string(),
    }).nullable().optional().openapi({
      description: 'Datos de la serie SUNAT (expandido)',
    }),
    numero: z.number().int().openapi({
      description: 'Número correlativo',
      example: 1
    }),
    tipo_nota: TipoNotaCreditoEnum.openapi({ example: 'DEVOLUCION_TOTAL' }),
    motivo_sustento: z.string().openapi({
      example: 'Cliente devuelve mercadería por producto defectuoso'
    }),
    monto_total: z.number().openapi({
      description: 'Monto total de la NC',
      example: 150.00
    }),
    stock_retornado: z.boolean().openapi({
      description: 'Indica si el stock ya fue devuelto al inventario',
      example: true
    }),
    estado_sunat: EstadoSunatEnum.nullable().openapi({ example: 'ACEPTADO' }),
    xml_url: z.string().nullable().openapi({
      description: 'URL del XML firmado',
      example: 'https://storage.example.com/xml/FN01-1.xml'
    }),
    cdr_url: z.string().nullable().openapi({
      description: 'URL de la Constancia de Recepción',
      example: 'https://storage.example.com/cdr/R-FN01-1.xml'
    }),
    hash_cpe: z.string().nullable().openapi({
      description: 'Hash del comprobante',
      example: 'abc123hash'
    }),
    fecha_emision: z.string().datetime().openapi({
      example: '2025-12-01T10:00:00Z'
    }),
    created_at: z.string().datetime().openapi({
      example: '2025-12-01T10:00:00Z'
    }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    venta_referencia_id: z.number().int().openapi({
      description: 'ID de la venta original',
      example: 123
    }),
    venta_referencia: z.object({
      id: z.number().int(),
      total: z.number(),
      created_at: z.string(),
      numero_comprobante: z.number().int().nullable(),
      serie: z.object({
        codigo: z.string(),
        tipo_comprobante: z.string(),
      }).nullable().optional(),
      cliente: z.object({
        id: z.number().int(),
        nombre: z.string(),
        documento_identidad: z.string().nullable(),
        ruc: z.string().nullable(),
        razon_social: z.string().nullable(),
      }).nullable().optional(),
    }).optional().openapi({
      description: 'Datos de la venta referenciada',
    }),
    usuario_id: z.number().int().nullable().openapi({
      description: 'ID del usuario que emitió la NC',
      example: 1
    }),
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string().nullable(),
      email: z.string(),
    }).nullable().optional().openapi({
      description: 'Datos del usuario emisor',
    }),
    detalles: z.array(NotaCreditoDetalleResponseSchema).optional().openapi({
      description: 'Detalles de productos afectados',
    }),
  })
);
export type NotaCreditoResponseDTO = z.infer<typeof NotaCreditoResponseSchema>;

/**
 * Query params para listar Notas de Crédito
 */
export const ListNotasCreditoQuerySchema = registry.register(
  'ListNotasCreditoQuery',
  PaginationQuerySchema.extend({
    q: z.string().optional().openapi({
      description: 'Búsqueda por serie/número o cliente',
      example: 'FN01',
    }),
    venta_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de venta',
      example: 123,
    }),
    estado_sunat: EstadoSunatEnum.optional().openapi({
      description: 'Filtrar por estado SUNAT',
      example: 'ACEPTADO',
    }),
    tipo_nota: TipoNotaCreditoEnum.optional().openapi({
      description: 'Filtrar por tipo de nota',
      example: 'DEVOLUCION_TOTAL',
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango de emisión',
      example: '2025-12-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha fin del rango de emisión',
      example: '2025-12-31T23:59:59Z',
    }),
  })
);
export type ListNotasCreditoQueryDTO = z.infer<typeof ListNotasCreditoQuerySchema>;

/**
 * Schema de respuesta paginada para Notas de Crédito
 */
export const PaginatedNotaCreditoResponseSchema = createPaginatedResponseSchema(
  NotaCreditoResponseSchema,
  'PaginatedNotaCreditoResponse'
);

/**
 * DTO para reenviar una NC a SUNAT (reintentar)
 */
export const ReenviarNotaCreditoSchema = registry.register(
  'ReenviarNotaCredito',
  z.object({
    nota_credito_id: z.number().int().positive().openapi({
      description: 'ID de la Nota de Crédito a reenviar',
      example: 1,
    }),
  })
);
export type ReenviarNotaCreditoDTO = z.infer<typeof ReenviarNotaCreditoSchema>;
