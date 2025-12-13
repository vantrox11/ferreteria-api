import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

// ============================================
// Query Params
// ============================================

export const DashboardQuerySchema = z.object({
  fecha_inicio: z.string().optional().openapi({
    description: 'Fecha de inicio en formato ISO (YYYY-MM-DD)',
    example: '2025-01-01',
  }),
  fecha_fin: z.string().optional().openapi({
    description: 'Fecha de fin en formato ISO (YYYY-MM-DD)',
    example: '2025-12-31',
  }),
});

export type DashboardQueryDTO = z.infer<typeof DashboardQuerySchema>;

// ============================================
// DASHBOARD GENERAL (Torre de Control / CEO)
// ============================================

/**
 * KPIs de la fila superior
 */
const LiquidezDesglosadaSchema = z.object({
  en_caja_riesgo: z.number().openapi({
    description: 'Suma de monto_final calculado de sesiones ABIERTAS (dinero físico en riesgo)',
    example: 5000.00,
  }),
  disponible_total: z.number().openapi({
    description: 'Suma de cierres acumulados + cuentas por cobrar pagadas',
    example: 45000.00,
  }),
});

const KPIConComparacionSchema = z.object({
  valor: z.number().openapi({ example: 12500.00 }),
  cambio_porcentual: z.number().openapi({
    description: 'Cambio porcentual vs periodo anterior (+/- %)',
    example: 15.5,
  }),
});

/**
 * Serie temporal para gráfico de flujo de caja
 */
const FlujoCajaDiaSchema = z.object({
  fecha: z.string().openapi({ example: '2025-01-15' }),
  ingresos: z.number().openapi({ example: 3500.00 }),
  egresos: z.number().openapi({ example: 1200.00 }),
});

/**
 * Serie temporal para ticket promedio
 */
const TicketPromedioDiaSchema = z.object({
  fecha: z.string().openapi({ example: '2025-01-15' }),
  ticket_promedio: z.number().openapi({ example: 85.50 }),
});

/**
 * Alerta de quiebre inminente de stock
 */
const AlertaQuiebreSchema = z.object({
  producto_id: z.number().openapi({ example: 1 }),
  producto_nombre: z.string().openapi({ example: 'Cemento Sol' }),
  stock_actual: z.number().openapi({ example: 15 }),
  velocidad_diaria: z.number().openapi({
    description: 'Unidades vendidas por día (promedio 30 días)',
    example: 5.2,
  }),
  dias_restantes: z.number().openapi({
    description: 'Días hasta agotamiento al ritmo actual',
    example: 2.9,
  }),
});

/**
 * Top deudor
 */
const TopDeudorSchema = z.object({
  cliente_id: z.number().openapi({ example: 5 }),
  cliente_nombre: z.string().openapi({ example: 'Construcciones ABC' }),
  deuda_vencida: z.number().openapi({ example: 8500.00 }),
  dias_vencido: z.number().openapi({
    description: 'Días desde la fecha de vencimiento más antigua',
    example: 15,
  }),
});

/**
 * Response del Dashboard General
 */
export const DashboardGeneralResponseSchema = registry.register(
  'DashboardGeneral',
  z.object({
    // Fila Superior: Signos Vitales
    liquidez: LiquidezDesglosadaSchema.openapi({
      description: 'Liquidez desglosada: efectivo en riesgo y disponible total',
    }),
    utilidad_bruta: KPIConComparacionSchema.openapi({
      description: 'Utilidad bruta real (precio - costo histórico) del período',
    }),
    cxc_vencidas: KPIConComparacionSchema.openapi({
      description: 'Cuentas por cobrar vencidas (dinero que ya debería estar en caja)',
    }),
    valor_inventario: z.number().openapi({
      description: 'Capital inmovilizado en inventario (stock × costo_compra)',
      example: 125000.00,
    }),

    // Zona Central: Tendencias
    flujo_caja_30d: z.array(FlujoCajaDiaSchema).openapi({
      description: 'Flujo de caja de los últimos 30 días (ingresos vs egresos)',
    }),
    ticket_promedio_30d: z.array(TicketPromedioDiaSchema).openapi({
      description: 'Evolución del ticket promedio de los últimos 30 días',
    }),

    // Zona Inferior: Alertas Críticas
    alertas_quiebre: z.array(AlertaQuiebreSchema).openapi({
      description: 'Productos que se agotarán en menos de 7 días',
    }),
    top_deudores: z.array(TopDeudorSchema).openapi({
      description: 'Top 5 clientes con mayor deuda vencida',
    }),

    // Indicador adicional
    porcentaje_ventas_credito: z.number().openapi({
      description: 'Porcentaje de ventas a crédito vs total (riesgo de liquidez si > 40%)',
      example: 35.5,
    }),
  })
);

export type DashboardGeneralResponseDTO = z.infer<typeof DashboardGeneralResponseSchema>;

// ============================================
// DASHBOARD DE VENTAS (Motor Comercial / Gerente)
// ============================================

/**
 * Producto en ranking
 */
const ProductoRankingSchema = z.object({
  producto_id: z.number().openapi({ example: 1 }),
  producto_nombre: z.string().openapi({ example: 'Cemento Sol' }),
  unidades_vendidas: z.number().openapi({ example: 150 }),
  ingresos: z.number().openapi({ example: 4500.00 }),
  utilidad: z.number().openapi({ example: 675.00 }),
  margen_porcentaje: z.number().openapi({ example: 15.0 }),
});

/**
 * Vendedor en ranking
 */
const VendedorRankingSchema = z.object({
  usuario_id: z.number().openapi({ example: 3 }),
  vendedor_nombre: z.string().openapi({ example: 'Juan Pérez' }),
  ventas_total: z.number().openapi({ example: 25000.00 }),
  utilidad_generada: z.number().openapi({ example: 4500.00 }),
  cantidad_ventas: z.number().openapi({ example: 85 }),
});

/**
 * Hora pico para mapa de calor
 */
const HoraPicoSchema = z.object({
  hora: z.number().min(0).max(23).openapi({
    description: 'Hora del día (0-23)',
    example: 10,
  }),
  cantidad_ventas: z.number().openapi({ example: 35 }),
  monto_total: z.number().openapi({ example: 5250.00 }),
});

/**
 * Response del Dashboard de Ventas
 */
export const DashboardVentasResponseSchema = registry.register(
  'DashboardVentas',
  z.object({
    periodo: z.object({
      fecha_inicio: z.string().openapi({ example: '2025-01-01' }),
      fecha_fin: z.string().openapi({ example: '2025-01-31' }),
    }),

    // Fila Superior: Rendimiento Táctico
    ventas_totales_netas: KPIConComparacionSchema.openapi({
      description: 'Total facturado en el período',
    }),
    margen_promedio: KPIConComparacionSchema.openapi({
      description: 'Margen promedio ponderado (%)',
    }),
    tasa_recurrencia: z.number().openapi({
      description: 'Porcentaje de ventas a clientes recurrentes (últimos 90 días)',
      example: 68.5,
    }),
    tasa_devoluciones: z.number().openapi({
      description: 'Porcentaje de devoluciones sobre ventas',
      example: 2.3,
    }),

    // Zona Central: Pareto Real
    top_rotacion: z.array(ProductoRankingSchema).openapi({
      description: 'Top 10 productos por unidades vendidas (traen tráfico)',
    }),
    top_rentabilidad: z.array(ProductoRankingSchema).openapi({
      description: 'Top 10 productos por utilidad generada (dejan dinero)',
    }),

    // Zona Inferior: Gestión del Equipo
    ranking_vendedores: z.array(VendedorRankingSchema).openapi({
      description: 'Ranking de vendedores ordenado por utilidad generada',
    }),
    mapa_calor_horario: z.array(HoraPicoSchema).openapi({
      description: 'Ventas por hora del día (0-23)',
    }),

    // Indicador Efectivo vs Crédito
    distribucion_pago: z.object({
      efectivo: z.number().openapi({ example: 65.5 }),
      credito: z.number().openapi({ example: 34.5 }),
    }).openapi({
      description: 'Distribución porcentual de ventas: efectivo vs crédito',
    }),
  })
);

export type DashboardVentasResponseDTO = z.infer<typeof DashboardVentasResponseSchema>;

// ============================================
// Schemas de queries para OpenAPI
// ============================================

export const DashboardGeneralQuerySchema = registry.register(
  'DashboardGeneralQuery',
  DashboardQuerySchema
);

export const DashboardVentasQuerySchema = registry.register(
  'DashboardVentasQuery',
  DashboardQuerySchema
);
