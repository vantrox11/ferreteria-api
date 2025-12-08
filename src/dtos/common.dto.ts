import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

// Valida parámetros de ruta con `id` numérico positivo
export const IdParamSchema = registry.register(
  'IdParam',
  z.object({
    id: z.coerce.number().int().positive().openapi({
      description: 'ID del recurso',
      example: 1,
    }),
  })
);

export type IdParamDTO = z.infer<typeof IdParamSchema>;

/**
 * Schema para parámetros con sesionId
 */
export const SesionIdParamSchema = registry.register(
  'SesionIdParam',
  z.object({
    sesionId: z.coerce.number().int().positive().openapi({
      description: 'ID de la sesión de caja',
      example: 1,
    }),
  })
);

export type SesionIdParamDTO = z.infer<typeof SesionIdParamSchema>;

/**
 * Schema estándar para respuestas exitosas de DELETE/PATCH
 */
export const SuccessResponseSchema = registry.register(
  'SuccessResponse',
  z.object({
    message: z.string().openapi({
      description: 'Mensaje de éxito',
      example: 'Operación completada exitosamente',
    }),
  })
);

export type SuccessResponseDTO = z.infer<typeof SuccessResponseSchema>;

/**
 * Helper para cantidades con máximo 3 decimales (según @db.Decimal(12,3))
 * Usado para: stock, cantidad de productos en ventas/compras/ajustes/pedidos
 */
export const cantidadDecimalSchema = z.union([
  z.number(),
  z.string().transform((val) => parseFloat(val))
]).pipe(
  z.number()
    .positive('La cantidad debe ser mayor a 0')
    .refine(
      (val) => {
        const decimals = val.toString().split('.')[1]?.length || 0;
        return decimals <= 3;
      },
      { message: 'La cantidad no puede tener más de 3 decimales' }
    )
);

/**
 * Helper para montos/precios con máximo 2 decimales (según @db.Decimal(12,2))
 * Usado para: precios, costos, montos de caja, totales
 */
export const montoDecimalSchema = z.union([
  z.number(),
  z.string().transform((val) => parseFloat(val))
]).pipe(
  z.number()
    .positive('El monto debe ser mayor a 0')
    .refine(
      (val) => {
        const decimals = val.toString().split('.')[1]?.length || 0;
        return decimals <= 2;
      },
      { message: 'El monto no puede tener más de 2 decimales' }
    )
);