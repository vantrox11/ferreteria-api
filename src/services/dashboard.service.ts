import { db } from '../config/db';
import type { DashboardQueryDTO, DashboardVentasEstadisticasResponseDTO } from '../dtos/dashboard.dto';
import type { DashboardGeneralResponseDTO } from '../dtos/dashboard-general.dto';
import type { DashboardVentasAnalisisResponseDTO } from '../dtos/dashboard-ventas.dto';

/**
 * Genera las estadísticas completas del dashboard de ventas
 */
export async function generarEstadisticasDashboardVentas(
  tenantId: number,
  params: DashboardQueryDTO
): Promise<DashboardVentasEstadisticasResponseDTO> {
  
  // Función auxiliar para convertir string "YYYY-MM-DD" a Date local (inicio del día)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Calcular fechas del período actual
  const fechaFin = params.fecha_fin 
    ? (() => {
        const date = parseLocalDate(params.fecha_fin);
        date.setHours(23, 59, 59, 999); // Fin del día
        return date;
      })()
    : (() => {
        const date = new Date();
        date.setHours(23, 59, 59, 999); // Fin del día actual
        return date;
      })();
  
  const fechaInicio = params.fecha_inicio 
    ? parseLocalDate(params.fecha_inicio)
    : (() => {
        const date = new Date(fechaFin);
        date.setDate(date.getDate() - 27); // 28 días atrás
        date.setHours(0, 0, 0, 0); // Inicio del día
        return date;
      })();

  // Calcular fechas del período anterior (mismo rango de días)
  const diasPeriodo = Math.floor((fechaFin.getTime() - fechaInicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const fechaInicioPeriodoAnterior = new Date(fechaInicio.getTime() - diasPeriodo * 24 * 60 * 60 * 1000);
  const fechaFinPeriodoAnterior = new Date(fechaInicio.getTime() - 24 * 60 * 60 * 1000);

  // 1. Obtener ventas del período actual con detalles
  const ventasActuales = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    include: {
      VentaDetalles: {
        include: {
          producto: {
            include: {
              categoria: true,
            },
          },
        },
      },
    },
  });

  // 2. Obtener ventas del período anterior (solo totales)
  const ventasAnteriores = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: fechaInicioPeriodoAnterior,
        lte: fechaFinPeriodoAnterior,
      },
    },
    select: {
      total: true,
      VentaDetalles: {
        select: {
          valor_unitario: true,
          cantidad: true,
          igv_total: true,
        },
      },
    },
  });

  // 3. Calcular KPIs del período actual
  let ingresosBrutos = 0;
  let costoMercaderia = 0;
  let igvAcumulado = 0;

  const productoVentas = new Map<number, { 
    nombre: string;
    unidades: number;
    ventas: number;
    costos: number;
    categoria: string;
  }>();

  const categoriaVentas = new Map<string, {
    ventas: number;
    costos: number;
  }>();

  // Procesar ventas actuales
  for (const venta of ventasActuales) {
    ingresosBrutos += Number(venta.total);
    
    for (const detalle of venta.VentaDetalles) {
      const cantidad = Number(detalle.cantidad);
      const valorUnitario = Number(detalle.valor_unitario);
      const precioUnitario = Number(detalle.precio_unitario);
      const igvLinea = Number(detalle.igv_total);
      
      // Costo estimado (asumiendo que valor_unitario es el costo base)
      // En producción, deberías usar el costo real del producto
      const costoEstimado = valorUnitario * 0.6; // Ajustar según tu margen promedio
      const costoTotal = costoEstimado * cantidad;
      
      costoMercaderia += costoTotal;
      igvAcumulado += igvLinea;

      // Agregar a productos
      const productoId = detalle.producto_id;
      if (!productoVentas.has(productoId)) {
        productoVentas.set(productoId, {
          nombre: detalle.producto.nombre,
          unidades: 0,
          ventas: 0,
          costos: 0,
          categoria: detalle.producto.categoria?.nombre || 'Sin categoría',
        });
      }
      
      const prod = productoVentas.get(productoId)!;
      prod.unidades += cantidad;
      prod.ventas += precioUnitario * cantidad;
      prod.costos += costoTotal;

      // Agregar a categorías
      const catNombre = detalle.producto.categoria?.nombre || 'Sin categoría';
      if (!categoriaVentas.has(catNombre)) {
        categoriaVentas.set(catNombre, { ventas: 0, costos: 0 });
      }
      const cat = categoriaVentas.get(catNombre)!;
      cat.ventas += precioUnitario * cantidad;
      cat.costos += costoTotal;
    }
  }

  const utilidadNeta = ingresosBrutos - costoMercaderia;
  const margenBruto = ingresosBrutos > 0 ? (utilidadNeta / ingresosBrutos) * 100 : 0;

  // 4. Calcular KPIs del período anterior
  let ingresosBrutosAnteriores = 0;
  let costoMercaderiaAnterior = 0;
  let igvAcumuladoAnterior = 0;

  for (const venta of ventasAnteriores) {
    ingresosBrutosAnteriores += Number(venta.total);
    
    for (const detalle of venta.VentaDetalles) {
      const cantidad = Number(detalle.cantidad);
      const valorUnitario = Number(detalle.valor_unitario);
      const costoEstimado = valorUnitario * 0.6;
      
      costoMercaderiaAnterior += costoEstimado * cantidad;
      igvAcumuladoAnterior += Number(detalle.igv_total);
    }
  }

  const utilidadNetaAnterior = ingresosBrutosAnteriores - costoMercaderiaAnterior;

  // 5. Calcular porcentajes de cambio
  const calcularCambio = (actual: number, anterior: number): number => {
    if (anterior === 0) return actual > 0 ? 100 : 0;
    return Number((((actual - anterior) / anterior) * 100).toFixed(1));
  };

  // 6. Generar serie temporal (datos por día)
  const serieTemporal: DashboardVentasEstadisticasResponseDTO['serie_temporal'] = [];
  
  for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
    const diaStr = d.toISOString().split('T')[0];
    const ventasDia = ventasActuales.filter(v => 
      v.created_at.toISOString().split('T')[0] === diaStr
    );

    let costoDia = 0;
    let gananciaDia = 0;
    let fisicaDia = 0;
    let webDia = 0;

    for (const venta of ventasDia) {
      const totalVenta = Number(venta.total);
      let costoVenta = 0;

      for (const detalle of venta.VentaDetalles) {
        const cantidad = Number(detalle.cantidad);
        const valorUnitario = Number(detalle.valor_unitario);
        costoVenta += valorUnitario * 0.6 * cantidad;
      }

      costoDia += costoVenta;
      gananciaDia += (totalVenta - costoVenta);

      // Determinar canal (esto depende de tu lógica de negocio)
      // Por ahora asumimos 70% física, 30% web
      if (Math.random() > 0.3) {
        fisicaDia += totalVenta;
      } else {
        webDia += totalVenta;
      }
    }

    serieTemporal.push({
      date: diaStr,
      costo: Math.round(costoDia * 100) / 100,
      ganancia: Math.round(gananciaDia * 100) / 100,
      fisica: Math.round(fisicaDia * 100) / 100,
      web: Math.round(webDia * 100) / 100,
    });
  }

  // 7. Top 5 productos rentables
  const productosArray = Array.from(productoVentas.entries()).map(([_, prod]) => ({
    nombre: prod.nombre,
    unidades: Math.round(prod.unidades),
    margen: prod.ventas > 0 
      ? Math.round(((prod.ventas - prod.costos) / prod.ventas) * 100) 
      : 0,
  }));

  const topProductos = productosArray
    .sort((a, b) => b.margen - a.margen)
    .slice(0, 5);

  // 8. Rentabilidad por categoría
  const categoriasArray = Array.from(categoriaVentas.entries()).map(([nombre, cat]) => {
    const margen = cat.ventas > 0 
      ? Math.round(((cat.ventas - cat.costos) / cat.ventas) * 100)
      : 0;
    
    let estado: 'Excelente' | 'Bueno' | 'Normal' | 'Volumen';
    if (margen >= 35) estado = 'Excelente';
    else if (margen >= 20) estado = 'Bueno';
    else if (margen >= 15) estado = 'Normal';
    else estado = 'Volumen';

    return {
      nombre,
      ventas: Math.round(cat.ventas * 100) / 100,
      margen,
      estado,
    };
  });

  const rentabilidadCategorias = categoriasArray.sort((a, b) => b.margen - a.margen);

  // 9. Retornar respuesta completa
  return {
    periodo: {
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
    },
    kpis: {
      ingresos_brutos: {
        valor: Math.round(ingresosBrutos * 100) / 100,
        comparacion_periodo_anterior: calcularCambio(ingresosBrutos, ingresosBrutosAnteriores),
      },
      costo_mercaderia: {
        valor: Math.round(costoMercaderia * 100) / 100,
        comparacion_periodo_anterior: calcularCambio(costoMercaderia, costoMercaderiaAnterior),
      },
      utilidad_neta: {
        valor: Math.round(utilidadNeta * 100) / 100,
        comparacion_periodo_anterior: calcularCambio(utilidadNeta, utilidadNetaAnterior),
      },
      igv_acumulado: {
        valor: Math.round(igvAcumulado * 100) / 100,
        comparacion_periodo_anterior: calcularCambio(igvAcumulado, igvAcumuladoAnterior),
      },
    },
    margen_bruto_porcentaje: Math.round(margenBruto * 10) / 10,
    serie_temporal: serieTemporal,
    top_productos_rentables: topProductos,
    rentabilidad_categorias: rentabilidadCategorias,
  };
}

/**
 * Genera estadísticas para el Dashboard General (Home / Vista del Dueño)
 */
export async function generarDashboardGeneral(
  tenantId: number
): Promise<DashboardGeneralResponseDTO> {
  
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  
  const inicioAyer = new Date(inicioHoy);
  inicioAyer.setDate(inicioAyer.getDate() - 1);
  const finAyer = new Date(finHoy);
  finAyer.setDate(finAyer.getDate() - 1);
  
  const inicio30Dias = new Date(ahora);
  inicio30Dias.setDate(inicio30Dias.getDate() - 30);

  // 1. Ventas del día
  const ventasHoy = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicioHoy, lte: finHoy },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
    },
    select: { total: true },
  });
  
  const ventasAyer = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicioAyer, lte: finAyer },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
    },
    select: { total: true },
  });

  const totalHoy = ventasHoy.reduce((sum, v) => sum + Number(v.total), 0);
  const totalAyer = ventasAyer.reduce((sum, v) => sum + Number(v.total), 0);
  const comparacionAyer = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : 0;

  // 2. Cuentas por cobrar vencidas
  const cuentasVencidas = await db.cuentasPorCobrar.findMany({
    where: {
      tenant_id: tenantId,
      estado: 'VENCIDA',
    },
    select: { saldo_pendiente: true },
  });

  const montoVencido = cuentasVencidas.reduce((sum, c) => sum + Number(c.saldo_pendiente), 0);

  // 3. Stock crítico
  const productosCriticos = await db.productos.findMany({
    where: {
      tenant_id: tenantId,
    },
    select: {
      id: true,
      nombre: true,
      stock: true,
      stock_minimo: true,
    },
    orderBy: { stock: 'asc' },
    take: 100, // Get more to filter
  });

  // Filter in memory for stock <= stock_minimo
  const productosFiltrados = productosCriticos
    .filter(p => Number(p.stock) <= Number(p.stock_minimo))
    .slice(0, 5);

  // 4. Caja actual (sum of monto_final from open sessions)
  const sesionesAbiertas = await db.sesionesCaja.findMany({
    where: {
      tenant_id: tenantId,
      fecha_cierre: null, // Sessions still open
    },
    select: { 
      monto_inicial: true,
      total_ventas: true,
    },
  });

  const saldoTotal = sesionesAbiertas.reduce((sum, s) => {
    return sum + Number(s.monto_inicial) + Number(s.total_ventas || 0);
  }, 0);

  // 5. Ventas últimos 30 días
  const ventasPorDia = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicio30Dias },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
    },
    select: {
      created_at: true,
      total: true,
    },
  });

  const ventasDiasMap = new Map<string, number>();
  for (const venta of ventasPorDia) {
    const fecha = venta.created_at.toISOString().split('T')[0];
    ventasDiasMap.set(fecha, (ventasDiasMap.get(fecha) || 0) + Number(venta.total));
  }

  const ventasUltimos30Dias = Array.from(ventasDiasMap.entries())
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // 6. Ventas por vendedor (top 5)
  const ventasConUsuario = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicio30Dias },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
      usuario_id: { not: null },
    },
    include: {
      usuario: true,
    },
  });

  const ventasPorUsuarioMap = new Map<string, number>();
  for (const venta of ventasConUsuario) {
    if (venta.usuario && venta.usuario.nombre) {
      const nombre = venta.usuario.nombre;
      ventasPorUsuarioMap.set(nombre, (ventasPorUsuarioMap.get(nombre) || 0) + Number(venta.total));
    }
  }
  
  const ventasPorVendedor = Array.from(ventasPorUsuarioMap.entries())
    .map(([vendedor_nombre, total_ventas]) => ({ vendedor_nombre, total_ventas }))
    .sort((a, b) => b.total_ventas - a.total_ventas)
    .slice(0, 5);

  // 7. Facturas pendientes SUNAT
  const facturasPendientes = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      estado_sunat: 'PENDIENTE',
    },
    include: {
      cliente: true,
      serie: true,
    },
    orderBy: { created_at: 'desc' },
    take: 10,
  });

  const facturasPendientesSunat = facturasPendientes.map(v => ({
    venta_id: v.id,
    comprobante: v.serie ? `${v.serie.codigo}-${String(v.numero_comprobante || 0).padStart(8, '0')}` : 'N/A',
    cliente: v.cliente?.razon_social || 'Sin cliente',
    total: Number(v.total),
    estado_sunat: v.estado_sunat || 'PENDIENTE',
    fecha: v.created_at.toISOString().split('T')[0],
  }));

  // 8. Respuesta
  return {
    kpis: {
      ventas_del_dia: {
        valor: Math.round(totalHoy * 100) / 100,
        comparacion_ayer: Math.round(comparacionAyer * 10) / 10,
      },
      cuentas_por_cobrar_vencidas: {
        monto_total: Math.round(montoVencido * 100) / 100,
        cantidad: cuentasVencidas.length,
      },
      stock_critico: {
        cantidad_productos: productosCriticos.length,
      },
      caja_actual: {
        saldo_total: Math.round(saldoTotal * 100) / 100,
        cajas_abiertas: sesionesAbiertas.length,
      },
    },
    ventas_ultimos_30_dias: ventasUltimos30Dias,
    ventas_por_vendedor: ventasPorVendedor,
    facturas_pendientes_sunat: facturasPendientesSunat,
    productos_criticos: productosFiltrados.map(p => ({
      producto_id: p.id,
      nombre: p.nombre,
      stock_actual: Number(p.stock),
      stock_minimo: Number(p.stock_minimo),
    })),
  };
}

/**
 * Genera estadísticas para el Dashboard de Ventas (Análisis Comercial)
 */
export async function generarDashboardVentasAnalisis(
  tenantId: number,
  fechaInicio?: string,
  fechaFin?: string
): Promise<DashboardVentasAnalisisResponseDTO> {
  
  // Función auxiliar para convertir string "YYYY-MM-DD" a Date
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  const ahora = new Date();
  const finPeriodo = fechaFin 
    ? (() => { const d = parseLocalDate(fechaFin); d.setHours(23, 59, 59, 999); return d; })()
    : (() => { const d = new Date(ahora); d.setHours(23, 59, 59, 999); return d; })();
  
  const inicioPeriodo = fechaInicio
    ? parseLocalDate(fechaInicio)
    : (() => { const d = new Date(finPeriodo); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d; })();

  // Período anterior (mismo rango de días)
  const diasPeriodo = Math.floor((finPeriodo.getTime() - inicioPeriodo.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const inicioPeriodoAnterior = new Date(inicioPeriodo.getTime() - diasPeriodo * 24 * 60 * 60 * 1000);
  const finPeriodoAnterior = new Date(inicioPeriodo.getTime() - 24 * 60 * 60 * 1000);

  // 1. Obtener ventas del período actual
  const ventasActuales = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicioPeriodo, lte: finPeriodo },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
    },
    include: {
      VentaDetalles: {
        include: {
          producto: {
            include: { categoria: true },
          },
        },
      },
      cliente: true,
    },
  });

  const ventasAnteriores = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicioPeriodoAnterior, lte: finPeriodoAnterior },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
    },
    select: { total: true },
  });

  // 2. KPI: Ticket Promedio
  const totalVentas = ventasActuales.reduce((sum, v) => sum + Number(v.total), 0);
  const ticketPromedio = ventasActuales.length > 0 ? totalVentas / ventasActuales.length : 0;
  
  const totalVentasAnt = ventasAnteriores.reduce((sum, v) => sum + Number(v.total), 0);
  const ticketPromedioAnt = ventasAnteriores.length > 0 ? totalVentasAnt / ventasAnteriores.length : 0;
  const comparacionTicket = ticketPromedioAnt > 0 
    ? ((ticketPromedio - ticketPromedioAnt) / ticketPromedioAnt) * 100 
    : 0;

  // 3. KPI: Margen de Ganancia
  let costoTotal = 0;
  for (const venta of ventasActuales) {
    for (const detalle of venta.VentaDetalles) {
      const cantidad = Number(detalle.cantidad);
      const valorUnitario = Number(detalle.valor_unitario);
      costoTotal += valorUnitario * 0.6 * cantidad; // Estimación
    }
  }
  const gananciaTotal = totalVentas - costoTotal;
  const margenPorcentaje = totalVentas > 0 ? (gananciaTotal / totalVentas) * 100 : 0;

  // 4. KPI: Ratio Contado vs Crédito
  let totalContado = 0;
  let totalCredito = 0;
  for (const venta of ventasActuales) {
    if (venta.condicion_pago === 'CONTADO') {
      totalContado += Number(venta.total);
    } else {
      totalCredito += Number(venta.total);
    }
  }
  const contadoPorcentaje = totalVentas > 0 ? (totalContado / totalVentas) * 100 : 0;
  const creditoPorcentaje = totalVentas > 0 ? (totalCredito / totalVentas) * 100 : 0;

  // 5. KPI: Notas de Crédito
  const notasCredito = await db.notasCredito.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicioPeriodo, lte: finPeriodo },
      estado_sunat: 'ACEPTADO',
    },
    select: { monto_total: true },
  });
  const totalNC = notasCredito.reduce((sum, nc) => sum + Number(nc.monto_total), 0);

  // 6. Ventas por Categoría
  const ventasPorCategoria = new Map<string, number>();
  for (const venta of ventasActuales) {
    for (const detalle of venta.VentaDetalles) {
      const categoria = detalle.producto.categoria?.nombre || 'Sin categoría';
      const monto = Number(detalle.precio_unitario) * Number(detalle.cantidad);
      ventasPorCategoria.set(categoria, (ventasPorCategoria.get(categoria) || 0) + monto);
    }
  }
  const ventasPorCategoriaArray = Array.from(ventasPorCategoria.entries())
    .map(([categoria, monto]) => ({
      categoria,
      monto,
      porcentaje: totalVentas > 0 ? (monto / totalVentas) * 100 : 0,
    }))
    .sort((a, b) => b.monto - a.monto);

  // 7. Métodos de pago últimos 7 días
  const inicio7Dias = new Date(finPeriodo);
  inicio7Dias.setDate(inicio7Dias.getDate() - 6);
  
  const ventas7Dias = await db.ventas.findMany({
    where: {
      tenant_id: tenantId,
      created_at: { gte: inicio7Dias, lte: finPeriodo },
      estado_sunat: { in: ['ACEPTADO', 'PENDIENTE'] },
    },
    select: {
      created_at: true,
      metodo_pago: true,
      total: true,
    },
  });

  const metodosPagoPorDia = new Map<string, { efectivo: number; yape: number; tarjeta: number }>();
  
  for (const venta of ventas7Dias) {
    const dia = venta.created_at.toISOString().split('T')[0];
    if (!metodosPagoPorDia.has(dia)) {
      metodosPagoPorDia.set(dia, { efectivo: 0, yape: 0, tarjeta: 0 });
    }
    const metodosDia = metodosPagoPorDia.get(dia)!;
    const monto = Number(venta.total);
    
    const metodo = venta.metodo_pago?.toUpperCase();
    if (metodo === 'EFECTIVO') metodosDia.efectivo += monto;
    else if (metodo === 'YAPE') metodosDia.yape += monto;
    else if (metodo === 'TARJETA') metodosDia.tarjeta += monto;
    else metodosDia.efectivo += monto; // Default to efectivo
  }
  
  const metodosPagoArray = Array.from(metodosPagoPorDia.entries())
    .map(([dia, metodos]) => ({ dia, ...metodos }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  // 8. Top 10 Productos Más Vendidos
  const productoVentas = new Map<number, { nombre: string; cantidad: number; total: number }>();
  for (const venta of ventasActuales) {
    for (const detalle of venta.VentaDetalles) {
      const prodId = detalle.producto_id;
      if (!productoVentas.has(prodId)) {
        productoVentas.set(prodId, {
          nombre: detalle.producto.nombre,
          cantidad: 0,
          total: 0,
        });
      }
      const prod = productoVentas.get(prodId)!;
      prod.cantidad += Number(detalle.cantidad);
      prod.total += Number(detalle.precio_unitario) * Number(detalle.cantidad);
    }
  }
  
  const top10Productos = Array.from(productoVentas.entries())
    .map(([id, prod]) => ({
      producto_id: id,
      nombre: prod.nombre,
      cantidad_vendida: prod.cantidad,
      total_generado: prod.total,
    }))
    .sort((a, b) => b.total_generado - a.total_generado)
    .slice(0, 10);

  // 9. Top 10 Mejores Clientes
  const clienteCompras = new Map<number, { nombre: string; total: number; ultimaCompra: Date }>();
  for (const venta of ventasActuales) {
    if (!venta.cliente_id) continue;
    
    const clienteId = venta.cliente_id;
    if (!clienteCompras.has(clienteId)) {
      clienteCompras.set(clienteId, {
        nombre: venta.cliente?.razon_social || 'Sin nombre',
        total: 0,
        ultimaCompra: venta.created_at,
      });
    }
    const cliente = clienteCompras.get(clienteId)!;
    cliente.total += Number(venta.total);
    if (venta.created_at > cliente.ultimaCompra) {
      cliente.ultimaCompra = venta.created_at;
    }
  }
  
  const top10Clientes = Array.from(clienteCompras.entries())
    .map(([id, cliente]) => ({
      cliente_id: id,
      nombre: cliente.nombre,
      total_comprado: cliente.total,
      ultima_compra: cliente.ultimaCompra.toISOString().split('T')[0],
    }))
    .sort((a, b) => b.total_comprado - a.total_comprado)
    .slice(0, 10);

  // 10. Respuesta
  return {
    kpis: {
      ticket_promedio: {
        valor: Math.round(ticketPromedio * 100) / 100,
        comparacion_mes_anterior: Math.round(comparacionTicket * 10) / 10,
      },
      margen_ganancia: {
        porcentaje: Math.round(margenPorcentaje * 10) / 10,
        total: Math.round(gananciaTotal * 100) / 100,
      },
      ratio_contado_credito: {
        contado_porcentaje: Math.round(contadoPorcentaje * 10) / 10,
        credito_porcentaje: Math.round(creditoPorcentaje * 10) / 10,
      },
      notas_credito: {
        monto_total: Math.round(totalNC * 100) / 100,
        cantidad: notasCredito.length,
      },
    },
    ventas_por_categoria: ventasPorCategoriaArray,
    metodos_pago_ultimos_7_dias: metodosPagoArray,
    top_10_productos: top10Productos,
    top_10_clientes: top10Clientes,
  };
}

