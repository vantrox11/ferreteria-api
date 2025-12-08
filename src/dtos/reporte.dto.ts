import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * Schema para un movimiento individual en el Kardex
 */
const MovimientoKardexSchema = z.object({
  fecha: z.string().datetime().openapi({
    description: 'Fecha del movimiento',
    example: '2024-01-15T10:30:00Z',
  }),
  tipo: z.enum(['venta', 'compra', 'ajuste_entrada', 'ajuste_salida']).openapi({
    description: 'Tipo de movimiento que afecta el stock',
    example: 'venta',
  }),
  cantidad: z.number().openapi({
    description: 'Cantidad de producto en el movimiento',
    example: 5,
  }),
  referencia: z.string().openapi({
    description: 'Referencia fiscal del movimiento (serie-número del comprobante)',
    example: 'B001-000045',
  }),
  tercero: z.string().optional().openapi({
    description: 'Nombre del cliente o proveedor',
    example: 'Juan Pérez García',
  }),
  tercero_documento: z.string().optional().openapi({
    description: 'Número de documento (RUC/DNI) del cliente o proveedor',
    example: '20123456789',
  }),
  motivo: z.string().optional().openapi({
    description: 'Motivo del movimiento (solo para ajustes)',
    example: 'Producto dañado',
  }),
  responsable: z.string().optional().openapi({
    description: 'Usuario responsable del movimiento (solo para ajustes)',
    example: 'admin@empresa.com',
  }),
  precio_unitario: z.number().optional().openapi({
    description: 'Precio o costo unitario del movimiento',
    example: 25.50,
  }),
  saldo: z.number().openapi({
    description: 'Stock acumulado después del movimiento',
    example: 45,
  }),
});

/**
 * Schema de respuesta para producto resumido en Kardex
 */
const ProductoKardexSchema = z.object({
  id: z.number().int().openapi({
    description: 'ID del producto',
    example: 1,
  }),
  nombre: z.string().openapi({
    description: 'Nombre del producto',
    example: 'Cemento Portland Tipo I',
  }),
  sku: z.string().nullable().openapi({
    description: 'SKU del producto (puede ser null si no está asignado)',
    example: 'CEM-PORT-001',
  }),
  stock: z.number().openapi({
    description: 'Stock actual del producto',
    example: 50,
  }),
});

/**
 * DTO de respuesta para Kardex completo de un producto
 */
export const KardexCompletoResponseSchema = registry.register(
  'KardexCompleto',
  z.object({
    producto: ProductoKardexSchema.openapi({
      description: 'Información básica del producto',
    }),
    stockActual: z.number().openapi({
      description: 'Stock actual del producto',
      example: 50,
    }),
    totalMovimientos: z.number().int().openapi({
      description: 'Cantidad total de movimientos registrados',
      example: 12,
    }),
    movimientos: z.array(MovimientoKardexSchema).openapi({
      description: 'Lista de movimientos ordenados cronológicamente (del más antiguo al más reciente)',
    }),
  })
);
export type KardexCompletoResponseDTO = z.infer<typeof KardexCompletoResponseSchema>;
