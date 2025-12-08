import { z } from 'zod';
import { registry } from '../config/openapi-registry';

/**
 * Query params para filtrar estadísticas del dashboard
 */
export const DashboardQuerySchema = z.object({
  fecha_inicio: z.string().optional().describe('Fecha de inicio en formato ISO (YYYY-MM-DD)'),
  fecha_fin: z.string().optional().describe('Fecha de fin en formato ISO (YYYY-MM-DD)'),
  canal: z.enum(['fisica', 'web', 'ambos']).optional().default('ambos').describe('Canal de venta'),
});

export type DashboardQueryDTO = z.infer<typeof DashboardQuerySchema>;

/**
 * KPI individual del dashboard
 */
const KPISchema = z.object({
  valor: z.number().describe('Valor actual del KPI'),
  comparacion_periodo_anterior: z.number().describe('Porcentaje de cambio vs período anterior'),
});

/**
 * Punto de datos para el gráfico de serie temporal
 */
const ChartDataPointSchema = z.object({
  date: z.string().describe('Fecha en formato ISO'),
  costo: z.number().describe('Costo de mercadería del día'),
  ganancia: z.number().describe('Ganancia/utilidad del día'),
  fisica: z.number().describe('Ventas en tienda física'),
  web: z.number().describe('Ventas por canal web'),
});

/**
 * Producto rentable
 */
const ProductoRentableSchema = z.object({
  nombre: z.string().describe('Nombre del producto'),
  unidades: z.number().describe('Unidades vendidas'),
  margen: z.number().describe('Porcentaje de margen de ganancia'),
});

/**
 * Rentabilidad por categoría
 */
const RentabilidadCategoriaSchema = z.object({
  nombre: z.string().describe('Nombre de la categoría'),
  ventas: z.number().describe('Total de ventas en soles'),
  margen: z.number().describe('Porcentaje de margen'),
  estado: z.enum(['Excelente', 'Bueno', 'Normal', 'Volumen']).describe('Estado de rentabilidad'),
});

/**
 * Response completo del dashboard de ventas
 */
export const DashboardVentasEstadisticasResponseSchema = registry.register(
  'DashboardVentasEstadisticas',
  z.object({
    periodo: z.object({
      fecha_inicio: z.string().describe('Fecha de inicio del período'),
      fecha_fin: z.string().describe('Fecha de fin del período'),
    }),
    kpis: z.object({
      ingresos_brutos: KPISchema.describe('Ingresos brutos totales'),
      costo_mercaderia: KPISchema.describe('Costo total de mercadería vendida'),
      utilidad_neta: KPISchema.describe('Utilidad neta (ingresos - costos)'),
      igv_acumulado: KPISchema.describe('IGV total acumulado'),
    }),
    margen_bruto_porcentaje: z.number().describe('Porcentaje de margen bruto general'),
    serie_temporal: z.array(ChartDataPointSchema).describe('Datos diarios para el gráfico'),
    top_productos_rentables: z.array(ProductoRentableSchema).describe('Top 5 productos más rentables'),
    rentabilidad_categorias: z.array(RentabilidadCategoriaSchema).describe('Rentabilidad por categoría'),
  })
);

export type DashboardVentasEstadisticasResponseDTO = z.infer<typeof DashboardVentasEstadisticasResponseSchema>;
