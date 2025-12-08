/**
 * DTO para consultar saldo disponible de Nota de Crédito
 * 
 * Responde si una venta puede emitir más NCs y cuánto saldo queda
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

/**
 * Respuesta del endpoint GET /api/ventas/:id/saldo-nc
 */
export const SaldoNCResponseSchema = z.object({
  saldo_disponible: z.number().openapi({
    description: 'Monto disponible para emitir nuevas NCs (total venta - total devuelto)',
    example: 450.50,
  }),
  total_venta: z.number().openapi({
    description: 'Monto total de la venta original',
    example: 1000.00,
  }),
  total_devuelto: z.number().openapi({
    description: 'Suma de todas las NCs emitidas (ACEPTADAS o PENDIENTES)',
    example: 549.50,
  }),
  puede_emitir_nc: z.boolean().openapi({
    description: 'Indica si se puede emitir una nueva NC',
    example: true,
  }),
  razon_bloqueo: z.string().nullable().openapi({
    description: 'Razón por la cual no se puede emitir NC (si aplica)',
    example: 'Venta anulada totalmente',
  }),
}).openapi('SaldoNCResponse');

export type SaldoNCResponseDTO = z.infer<typeof SaldoNCResponseSchema>;
