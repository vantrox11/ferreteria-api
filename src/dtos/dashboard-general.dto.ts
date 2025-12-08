import { z } from 'zod';

/**
 * DTO para Dashboard General (Home / Vista del Dueño)
 */

export const DashboardGeneralKPIsSchema = z.object({
  ventas_del_dia: z.object({
    valor: z.number(),
    comparacion_ayer: z.number(), // Porcentaje
  }),
  cuentas_por_cobrar_vencidas: z.object({
    monto_total: z.number(),
    cantidad: z.number(),
  }),
  stock_critico: z.object({
    cantidad_productos: z.number(),
  }),
  caja_actual: z.object({
    saldo_total: z.number(),
    cajas_abiertas: z.number(),
  }),
});

export const VentasUltimos30DiasSchema = z.object({
  fecha: z.string(),
  total: z.number(),
});

export const VentasPorVendedorSchema = z.object({
  vendedor_nombre: z.string(),
  total_ventas: z.number(),
});

export const FacturaPendienteSUNATSchema = z.object({
  venta_id: z.number(),
  comprobante: z.string(),
  cliente: z.string(),
  total: z.number(),
  estado_sunat: z.string(),
  fecha: z.string(),
});

export const ProductoCriticoSchema = z.object({
  producto_id: z.number(),
  nombre: z.string(),
  stock_actual: z.number(),
  stock_minimo: z.number(),
});

export const DashboardGeneralResponseSchema = z.object({
  kpis: DashboardGeneralKPIsSchema,
  ventas_ultimos_30_dias: z.array(VentasUltimos30DiasSchema),
  ventas_por_vendedor: z.array(VentasPorVendedorSchema),
  facturas_pendientes_sunat: z.array(FacturaPendienteSUNATSchema),
  productos_criticos: z.array(ProductoCriticoSchema),
});

export type DashboardGeneralResponseDTO = z.infer<typeof DashboardGeneralResponseSchema>;
