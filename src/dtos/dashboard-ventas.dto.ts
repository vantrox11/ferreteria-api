import { z } from 'zod';

/**
 * DTO para Dashboard de Ventas (Análisis Comercial)
 */

export const DashboardVentasKPIsSchema = z.object({
  ticket_promedio: z.object({
    valor: z.number(),
    comparacion_mes_anterior: z.number(), // Porcentaje
  }),
  margen_ganancia: z.object({
    porcentaje: z.number(),
    total: z.number(),
  }),
  ratio_contado_credito: z.object({
    contado_porcentaje: z.number(),
    credito_porcentaje: z.number(),
  }),
  notas_credito: z.object({
    monto_total: z.number(),
    cantidad: z.number(),
  }),
});

export const VentasPorCategoriaSchema = z.object({
  categoria: z.string(),
  monto: z.number(),
  porcentaje: z.number(),
});

export const MetodosPagoPorDiaSchema = z.object({
  dia: z.string(),
  efectivo: z.number(),
  yape: z.number(),
  tarjeta: z.number(),
});

export const ProductoMasVendidoSchema = z.object({
  producto_id: z.number(),
  nombre: z.string(),
  cantidad_vendida: z.number(),
  total_generado: z.number(),
});

export const MejorClienteSchema = z.object({
  cliente_id: z.number(),
  nombre: z.string(),
  total_comprado: z.number(),
  ultima_compra: z.string(),
});

export const DashboardVentasAnalisisResponseSchema = z.object({
  kpis: DashboardVentasKPIsSchema,
  ventas_por_categoria: z.array(VentasPorCategoriaSchema),
  metodos_pago_ultimos_7_dias: z.array(MetodosPagoPorDiaSchema),
  top_10_productos: z.array(ProductoMasVendidoSchema),
  top_10_clientes: z.array(MejorClienteSchema),
});

export type DashboardVentasAnalisisResponseDTO = z.infer<typeof DashboardVentasAnalisisResponseSchema>;
