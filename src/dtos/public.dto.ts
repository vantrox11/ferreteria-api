import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';
import { cantidadDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * DTO para crear pedido desde el checkout público (sin autenticación)
 */

// Schema para detalle de pedido público
const DetallePedidoPublicoSchema = z.object({
  producto_id: z.number().int().positive('ID de producto requerido').openapi({
    description: 'ID del producto a pedir',
    example: 1,
  }),
  cantidad: cantidadDecimalSchema.openapi({
    description: 'Cantidad solicitada (máximo 3 decimales)',
    example: 2,
  }),
});

// Schema para datos del cliente en checkout público
const DatosClientePublicoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres').openapi({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez',
  }),
  documento_identidad: z.string()
    .regex(/^[0-9]{8}$|^[0-9]{11}$/, 'El documento debe ser DNI (8 dígitos) o RUC (11 dígitos)')
    .openapi({
      description: 'DNI (8 dígitos) o RUC (11 dígitos) del cliente',
      example: '12345678',
    }),
  email: z.string()
    .email('Email inválido')
    .max(100, 'Máximo 100 caracteres')
    .openapi({
      description: 'Email del cliente para notificaciones',
      example: 'juan.perez@email.com',
    }),
  telefono: z.string()
    .min(7, 'Teléfono inválido')
    .max(30, 'Máximo 30 caracteres')
    .openapi({
      description: 'Teléfono de contacto del cliente',
      example: '987654321',
    }),
  direccion: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .openapi({
      description: 'Dirección del cliente (opcional, requerido si tipo_recojo es "envio")',
      example: 'Av. Los Proceres 123, Lima',
    }),
});

export const CreatePedidoPublicoSchema = registry.register(
  'CreatePedidoPublico',
  z.object({
    cliente: DatosClientePublicoSchema.openapi({
      description: 'Datos del cliente (se buscará o creará automáticamente)',
    }),
    tipo_recojo: z.enum(['tienda', 'envio']).openapi({
      description: 'Tipo de recojo: en tienda o envío a domicilio',
      example: 'tienda',
    }),
    carrito: z.array(DetallePedidoPublicoSchema)
      .min(1, 'Debe incluir al menos un producto en el carrito')
      .openapi({
        description: 'Lista de productos en el carrito',
      }),
  }).refine(
    (data) => {
      // Si tipo_recojo es envio, debe tener dirección
      if (data.tipo_recojo === 'envio' && !data.cliente.direccion) {
        return false;
      }
      return true;
    },
    {
      message: 'Si el tipo de recojo es "envio", debe proporcionar una dirección',
      path: ['cliente', 'direccion'],
    }
  )
);

export type CreatePedidoPublicoDTO = z.infer<typeof CreatePedidoPublicoSchema>;

/**
 * Schema de respuesta para pedido público creado
 */
export const PedidoPublicoResponseSchema = registry.register(
  'PedidoPublicoResponse',
  z.object({
    pedido_id: z.number().int().openapi({
      description: 'ID del pedido creado',
      example: 150,
    }),
    estado: z.enum(['pendiente']).openapi({
      description: 'Estado inicial del pedido (siempre "pendiente")',
      example: 'pendiente',
    }),
    mensaje: z.string().openapi({
      description: 'Mensaje de confirmación para el cliente',
      example: 'Pedido registrado exitosamente. Recibirá un correo de confirmación pronto.',
    }),
  })
);

/**
 * Schema de respuesta para producto en catálogo público
 */
export const ProductoCatalogoPublicoSchema = registry.register(
  'ProductoCatalogoPublico',
  z.object({
    id: z.number().int().openapi({
      description: 'ID del producto',
      example: 1,
    }),
    nombre: z.string().openapi({
      description: 'Nombre del producto',
      example: 'Martillo de Acero 500g',
    }),
    descripcion: z.string().nullable().openapi({
      description: 'Descripción del producto',
      example: 'Martillo profesional con mango ergonómico',
    }),
    precio_venta: z.number().openapi({
      description: 'Precio final de venta (incluye IGV si aplica)',
      example: 45.50,
    }),
    disponible: z.boolean().openapi({
      description: 'Indica si el producto tiene stock disponible',
      example: true,
    }),
    stock: z.number().openapi({
      description: 'Stock disponible',
      example: 150,
    }),
    imagen_url: z.string().nullable().openapi({
      description: 'URL de la imagen principal del producto',
      example: 'https://res.cloudinary.com/...',
    }),
    marca: z.string().nullable().openapi({
      description: 'Nombre de la marca',
      example: 'Stanley',
    }),
    categoria: z.string().nullable().openapi({
      description: 'Nombre de la categoría',
      example: 'Herramientas',
    }),
    sku: z.string().nullable().openapi({
      description: 'Código SKU del producto',
      example: 'MRT-500',
    }),
  })
);

/**
 * Query params para catálogo público
 */
export const CatalogoPublicoQuerySchema = registry.register(
  'CatalogoPublicoQuery',
  z.object({
    q: z.string().optional().openapi({
      description: 'Término de búsqueda (nombre, SKU)',
      example: 'martillo',
    }),
    categoria_id: z.string().optional().openapi({
      description: 'Filtrar por ID de categoría',
      example: '5',
    }),
    marca_id: z.string().optional().openapi({
      description: 'Filtrar por ID de marca',
      example: '3',
    }),
    limit: z.string().optional().openapi({
      description: 'Número máximo de productos a devolver (default: 50, max: 100)',
      example: '20',
    }),
  })
);

export type CatalogoPublicoQueryDTO = z.infer<typeof CatalogoPublicoQuerySchema>;
