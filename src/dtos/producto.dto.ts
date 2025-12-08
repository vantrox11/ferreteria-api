import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

// Helper para convertir string a número (soporta decimales desde frontend)
const decimalSchema = z.union([
  z.number(),
  z.string().transform((val) => parseFloat(val))
]).pipe(z.number().nonnegative('Debe ser >= 0'));

/**
 * Schema para crear un nuevo producto
 * El usuario ingresa precio_venta CON IGV (así piensa el ferretero)
 * El backend calcula precio_base automáticamente según afectación IGV
 */
export const CreateProductoSchema = registry.register(
  'CreateProducto',
  z.object({
    nombre: z.string().min(1, 'El nombre es requerido').openapi({
      description: 'Nombre del producto',
      example: 'Martillo Stanley 16oz',
    }),
    sku: z.string().min(1).optional().openapi({
      description: 'Código SKU único del producto',
      example: 'MAR-ST-16',
    }),
    descripcion: z.string().optional().openapi({
      description: 'Descripción detallada del producto',
      example: 'Martillo de carpintero con mango de fibra de vidrio',
    }),
    precio_venta: z.number().positive('El precio de venta debe ser mayor a 0').openapi({
      description: 'Precio de venta CON IGV (18%)',
      example: 59.00,
    }),
    afectacion_igv: z.enum(['GRAVADO', 'EXONERADO', 'INAFECTO']).default('GRAVADO').openapi({
      description: 'Tipo de afectación al IGV según SUNAT',
      example: 'GRAVADO',
    }),
    costo_compra: z.number().nonnegative().optional().openapi({
      description: 'Costo de compra/adquisición (opcional)',
      example: 35.00,
    }),
    stock: decimalSchema.default(0).openapi({
      description: 'Cantidad en inventario (soporta decimales, default: 0)',
      example: 100.5,
    }),
    stock_minimo: z.number().int().nonnegative().default(5).openapi({
      description: 'Stock mínimo para alertas (default: 5)',
      example: 10,
    }),
    categoria_id: z.number().int().optional().openapi({
      description: 'ID de la categoría del producto',
      example: 5,
    }),
    unidad_medida_id: z.number().int().positive('La unidad de medida es requerida').openapi({
      description: 'ID de la unidad de medida (NIU, UND, KG, etc.)',
      example: 1,
    }),
    marca_id: z.number().int().positive().optional().openapi({
      description: 'ID de la marca del producto',
      example: 3,
    }),
    imagen_url: z.string().url().optional().nullable().openapi({
      description: 'URL de la imagen en Cloudinary',
      example: 'https://res.cloudinary.com/ferreteria/image/upload/v1234567890/productos/martillo.jpg',
    }),
  })
);

export type CreateProductoDTO = z.infer<typeof CreateProductoSchema>;

/**
 * Schema para actualizar un producto existente
 * Todos los campos son opcionales, pero requiere al menos uno
 */
export const UpdateProductoSchema = registry.register(
  'UpdateProducto',
  CreateProductoSchema.partial().extend({
    isActive: z.boolean().optional().openapi({
      description: 'Estado activo/inactivo (para borrado lógico)',
      example: true,
    }),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo a actualizar' }
  )
);

export type UpdateProductoDTO = z.infer<typeof UpdateProductoSchema>;

/**
 * Schema de respuesta: Producto completo
 */
export const ProductoResponseSchema = registry.register(
  'Producto',
  z.object({
    id: z.number().int().openapi({
      description: 'ID único del producto',
      example: 1,
    }),
    nombre: z.string().openapi({
      example: 'Martillo Stanley 16oz',
    }),
    sku: z.string().nullable().openapi({
      example: 'MAR-ST-16',
    }),
    descripcion: z.string().nullable().openapi({
      example: 'Martillo de carpintero con mango de fibra de vidrio',
    }),
    precio_base: z.number().openapi({
      description: 'Precio sin IGV (calculado automáticamente)',
      example: 50.00,
    }),
    precio_venta: z.number().openapi({
      description: 'Precio con IGV',
      example: 59.00,
    }),
    afectacion_igv: z.enum(['GRAVADO', 'EXONERADO', 'INAFECTO']).openapi({
      example: 'GRAVADO',
    }),
    costo_compra: z.number().nullable().openapi({
      example: 35.00,
    }),
    stock: z.number().openapi({
      description: 'Cantidad disponible (puede ser decimal)',
      example: 100.5,
    }),
    stock_minimo: z.number().int().openapi({
      description: 'Stock mínimo para alertas',
      example: 10,
    }),
    imagen_url: z.string().nullable().openapi({
      example: 'https://res.cloudinary.com/ferreteria/image/upload/v1234567890/productos/martillo.jpg',
    }),
    marca_id: z.number().int().nullable().openapi({
      example: 3,
    }),
    unidad_medida_id: z.number().int().openapi({
      example: 1,
    }),
    categoria_id: z.number().int().nullable().openapi({
      example: 5,
    }),
    isActive: z.boolean().openapi({
      description: 'Estado del producto (soft delete)',
      example: true,
    }),
    tenant_id: z.number().int().openapi({
      description: 'ID del tenant propietario',
      example: 1,
    }),
  })
);

export type ProductoResponseDTO = z.infer<typeof ProductoResponseSchema>;

/**
 * Schema para subir imagen de producto
 */
export const UploadImagenProductoSchema = registry.register(
  'UploadImagenProducto',
  z.object({
    message: z.string().openapi({
      description: 'Mensaje de éxito',
      example: 'Imagen subida exitosamente',
    }),
    producto: z.object({
      id: z.number().int().openapi({ example: 1 }),
      nombre: z.string().openapi({ example: 'Martillo' }),
      imagen_url: z.string().url().nullable().openapi({
        description: 'URL de la imagen original',
        example: 'https://res.cloudinary.com/ferreteria/image/upload/v1234567890/productos/martillo.jpg',
      }),
      thumbnail_small: z.string().url().nullable().optional().openapi({
        description: 'URL del thumbnail pequeño (100x100)',
        example: 'https://res.cloudinary.com/ferreteria/image/upload/c_fill,h_100,w_100/v1234567890/productos/martillo.jpg',
      }),
      thumbnail_medium: z.string().url().nullable().optional().openapi({
        description: 'URL del thumbnail mediano (300x300)',
        example: 'https://res.cloudinary.com/ferreteria/image/upload/c_fill,h_300,w_300/v1234567890/productos/martillo.jpg',
      }),
    }).openapi({
      description: 'Datos del producto actualizado',
    }),
  })
);

export type UploadImagenProductoDTO = z.infer<typeof UploadImagenProductoSchema>;