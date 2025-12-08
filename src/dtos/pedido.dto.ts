import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';
import { cantidadDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * Enums del dominio de Pedidos
 */
export const EstadoPedidoEnum = z.enum(['pendiente', 'confirmado', 'cancelado', 'entregado']);
export const TipoRecojoEnum = z.enum(['tienda', 'envio']);

/**
 * Schema para detalle de pedido al crear
 */
const CreateDetallePedidoSchema = z.object({
  producto_id: z.number().int().positive('ID de producto requerido').openapi({
    description: 'ID del producto a pedir',
    example: 1,
  }),
  cantidad: cantidadDecimalSchema.openapi({
    description: 'Cantidad solicitada (máximo 3 decimales)',
    example: 3,
  }),
});

/**
 * DTO para crear un nuevo pedido
 */
export const CreatePedidoSchema = registry.register(
  'CreatePedido',
  z.object({
    cliente_id: z.number().int().positive().nullable().optional().openapi({
      description: 'ID del cliente (opcional)',
      example: 1,
    }),
    tipo_recojo: TipoRecojoEnum.openapi({
      description: 'Tipo de recojo: tienda o envío',
      example: 'tienda',
    }),
    detalles: z.array(CreateDetallePedidoSchema).min(1, 'Debe incluir al menos un producto en el pedido').openapi({
      description: 'Detalles de los productos del pedido',
    }),
  })
);
export type CreatePedidoDTO = z.infer<typeof CreatePedidoSchema>;

/**
 * Query params para listar pedidos
 */
export const ListPedidosQuerySchema = registry.register(
  'ListPedidosQuery',
  z.object({
    estado: EstadoPedidoEnum.optional().openapi({
      description: 'Filtrar por estado del pedido',
      example: 'pendiente',
    }),
  })
);
export type ListPedidosQueryDTO = z.infer<typeof ListPedidosQuerySchema>;

/**
 * DTO para confirmar pedido
 */
export const ConfirmarPedidoSchema = registry.register(
  'ConfirmarPedido',
  z.object({
    mensaje: z.string().max(500).optional().openapi({
      description: 'Mensaje opcional para el cliente',
      example: 'Tu pedido ha sido confirmado y estará listo en 2 horas',
    }),
  })
);
export type ConfirmarPedidoDTO = z.infer<typeof ConfirmarPedidoSchema>;

/**
 * DTO para cancelar pedido
 */
export const CancelarPedidoSchema = registry.register(
  'CancelarPedido',
  z.object({
    razon: z.string().min(3, 'Debe indicar una razón').max(500).openapi({
      description: 'Razón de la cancelación del pedido',
      example: 'Producto agotado',
    }),
  })
);
export type CancelarPedidoDTO = z.infer<typeof CancelarPedidoSchema>;

/**
 * DTO para generar venta desde pedido
 */
export const GenerarVentaSchema = registry.register(
  'GenerarVenta',
  z.object({
    metodo_pago: z.string().max(100).optional().openapi({
      description: 'Método de pago utilizado',
      example: 'EFECTIVO',
    }),
  })
);
export type GenerarVentaDTO = z.infer<typeof GenerarVentaSchema>;

/**
 * Schema para detalle de pedido en respuesta (PedidoDetalles)
 */
const DetallePedidoResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  cantidad: z.number().openapi({ 
    description: 'Cantidad solicitada (soporta decimales)',
    example: 3 
  }),
  tenant_id: z.number().int().openapi({ example: 1 }),
  pedido_id: z.number().int().openapi({ example: 1 }),
  producto_id: z.number().int().openapi({ example: 1 }),
  producto: z.object({
    id: z.number().int(),
    nombre: z.string(),
    sku: z.string().nullable(),
    precio_base: z.number(),
    afectacion_igv: z.enum(['GRAVADO', 'EXONERADO', 'INAFECTO']),
  }).optional(),
});

/**
 * DTO de respuesta para pedido (según schema.prisma: Pedidos)
 */
export const PedidoResponseSchema = registry.register(
  'Pedido',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del pedido',
      example: 1,
    }),
    created_at: z.string().datetime().openapi({
      description: 'Fecha de creación del pedido',
      example: '2025-11-16T10:30:00Z',
    }),
    estado: EstadoPedidoEnum.openapi({
      description: 'Estado del pedido',
      example: 'pendiente',
    }),
    tipo_recojo: TipoRecojoEnum.openapi({
      description: 'Tipo de entrega: tienda o envío',
      example: 'tienda',
    }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    cliente_id: z.number().int().nullable().openapi({ 
      description: 'ID del cliente (opcional)',
      example: 1 
    }),
    cliente: z.object({
      id: z.number().int(),
      nombre: z.string(),
      telefono: z.string().nullable(),
      documento_identidad: z.string().nullable(),
    }).nullable().optional(),
    usuario_gestion_id: z.number().int().nullable().openapi({
      description: 'ID del usuario que gestionó el pedido',
      example: 1 
    }),
    usuario_gestion: z.object({
      id: z.number().int(),
      nombre: z.string().nullable(),
      email: z.string(),
    }).nullable().optional(),
    detalles: z.array(DetallePedidoResponseSchema).optional().openapi({
      description: 'Detalles de los productos del pedido',
    }),
  })
);
export type PedidoResponseDTO = z.infer<typeof PedidoResponseSchema>;

/**
 * DTO de respuesta para generar venta desde pedido
 */
export const GenerarVentaResponseSchema = registry.register(
  'GenerarVentaResponse',
  z.object({
    message: z.string().openapi({
      description: 'Mensaje de confirmación',
      example: 'Venta generada exitosamente desde el pedido',
    }),
    venta_id: z.number().int().openapi({
      description: 'ID de la venta generada',
      example: 1,
    }),
    pedido_id: z.number().int().openapi({
      description: 'ID del pedido procesado',
      example: 1,
    }),
  })
);
export type GenerarVentaResponseDTO = z.infer<typeof GenerarVentaResponseSchema>;