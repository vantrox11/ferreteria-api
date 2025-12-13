import { db } from '../config/db';
import { subDays, startOfDay, endOfDay, format, differenceInDays } from 'date-fns';
import type { DashboardGeneralResponseDTO, DashboardVentasResponseDTO } from '../dtos/dashboard.dto';
import { Prisma } from '@prisma/client';

/**
 * Servicio de Dashboards
 * Implementa la especificación de dashboard.md
 */

// ============================================
// DASHBOARD GENERAL (Torre de Control / CEO)
// ============================================

export async function generarDashboardGeneral(
    tenantId: number
): Promise<DashboardGeneralResponseDTO> {
    const hoy = new Date();
    const hace30Dias = subDays(hoy, 30);
    const hace60Dias = subDays(hoy, 60);

    // ============================================
    // 1. LIQUIDEZ DESGLOSADA
    // ============================================

    // A. En Caja (Riesgo) - Sesiones abiertas
    const sesionesAbiertas = await db.sesionesCaja.findMany({
        where: { tenant_id: tenantId, estado: 'ABIERTA' },
        include: {
            movimientos: true,
            ventas: { select: { total: true } },
        },
    });

    let enCajaRiesgo = 0;
    for (const sesion of sesionesAbiertas) {
        const montoInicial = Number(sesion.monto_inicial);
        const totalVentas = sesion.ventas.reduce((sum, v) => sum + Number(v.total), 0);
        const ingresos = sesion.movimientos
            .filter(m => m.tipo === 'INGRESO')
            .reduce((sum, m) => sum + Number(m.monto), 0);
        const egresos = sesion.movimientos
            .filter(m => m.tipo === 'EGRESO')
            .reduce((sum, m) => sum + Number(m.monto), 0);
        enCajaRiesgo += montoInicial + totalVentas + ingresos - egresos;
    }

    // B. Disponible Total - Cierres de sesiones cerradas
    const sesionesCerradas = await db.sesionesCaja.aggregate({
        where: {
            tenant_id: tenantId,
            estado: 'CERRADA',
            fecha_cierre: { gte: hace30Dias },
        },
        _sum: { monto_final: true },
    });
    const disponibleTotal = Number(sesionesCerradas._sum.monto_final ?? 0) + enCajaRiesgo;

    // ============================================
    // 2. UTILIDAD BRUTA REAL (con costo histórico)
    // ============================================

    // Usamos costo_unitario snapshot de VentaDetalles para cálculo exacto
    const ventasDetalles30d = await db.ventaDetalles.findMany({
        where: {
            tenant_id: tenantId,
            venta: { created_at: { gte: hace30Dias } },
        },
        select: { precio_unitario: true, cantidad: true, costo_unitario: true },
    });

    const utilidadBruta30d = ventasDetalles30d.reduce((sum, d) => {
        const precio = Number(d.precio_unitario);
        const costo = Number(d.costo_unitario ?? 0); // Costo histórico snapshot
        const cantidad = Number(d.cantidad);
        return sum + (precio - costo) * cantidad;
    }, 0);

    // Período anterior para comparación
    const ventasDetallesPrevio = await db.ventaDetalles.findMany({
        where: {
            tenant_id: tenantId,
            venta: { created_at: { gte: hace60Dias, lt: hace30Dias } },
        },
        select: { precio_unitario: true, cantidad: true, costo_unitario: true },
    });

    const utilidadBrutaPrevio = ventasDetallesPrevio.reduce((sum, d) => {
        const precio = Number(d.precio_unitario);
        const costo = Number(d.costo_unitario ?? 0); // Costo histórico snapshot
        const cantidad = Number(d.cantidad);
        return sum + (precio - costo) * cantidad;
    }, 0);

    const cambioPctUtilidad = utilidadBrutaPrevio > 0
        ? ((utilidadBruta30d - utilidadBrutaPrevio) / utilidadBrutaPrevio) * 100
        : 0;

    // ============================================
    // 3. CUENTAS POR COBRAR VENCIDAS
    // ============================================

    const cxcVencidas = await db.cuentasPorCobrar.aggregate({
        where: {
            tenant_id: tenantId,
            fecha_vencimiento: { lt: hoy },
            estado: { in: ['VIGENTE', 'VENCIDA', 'POR_VENCER'] },
        },
        _sum: { saldo_pendiente: true },
    });
    const totalCxcVencidas = Number(cxcVencidas._sum.saldo_pendiente ?? 0);

    // Período anterior (hace 30-60 días comparado con hoy-30)
    const cxcVencidasPrevio = await db.cuentasPorCobrar.aggregate({
        where: {
            tenant_id: tenantId,
            fecha_vencimiento: { lt: hace30Dias },
            estado: { in: ['VIGENTE', 'VENCIDA', 'POR_VENCER'] },
        },
        _sum: { saldo_pendiente: true },
    });
    const totalCxcPrevio = Number(cxcVencidasPrevio._sum.saldo_pendiente ?? 0);
    const cambioPctCxc = totalCxcPrevio > 0
        ? ((totalCxcVencidas - totalCxcPrevio) / totalCxcPrevio) * 100
        : 0;

    // ============================================
    // 4. VALOR DEL INVENTARIO
    // ============================================

    const productos = await db.productos.findMany({
        where: { tenant_id: tenantId, isActive: true },
        select: { stock: true, costo_compra: true },
    });

    const valorInventario = productos.reduce((sum, p) => {
        return sum + Number(p.stock) * Number(p.costo_compra ?? 0);
    }, 0);

    // ============================================
    // 5. GRÁFICO FLUJO DE CAJA (30 días)
    // ============================================

    const movimientosCaja30d = await db.movimientosCaja.findMany({
        where: {
            tenant_id: tenantId,
            fecha: { gte: hace30Dias },
        },
        orderBy: { fecha: 'asc' },
    });

    // Agrupar por día
    const flujoPorDia: Record<string, { ingresos: number; egresos: number }> = {};
    for (let i = 0; i < 30; i++) {
        const fecha = format(subDays(hoy, 29 - i), 'yyyy-MM-dd');
        flujoPorDia[fecha] = { ingresos: 0, egresos: 0 };
    }

    for (const mov of movimientosCaja30d) {
        const fecha = format(mov.fecha, 'yyyy-MM-dd');
        if (flujoPorDia[fecha]) {
            if (mov.tipo === 'INGRESO') {
                flujoPorDia[fecha].ingresos += Number(mov.monto);
            } else {
                flujoPorDia[fecha].egresos += Number(mov.monto);
            }
        }
    }

    const flujoCaja30d = Object.entries(flujoPorDia).map(([fecha, data]) => ({
        fecha,
        ingresos: Math.round(data.ingresos * 100) / 100,
        egresos: Math.round(data.egresos * 100) / 100,
    }));

    // ============================================
    // 6. TICKET PROMEDIO (30 días)
    // ============================================

    const ventas30d = await db.ventas.findMany({
        where: {
            tenant_id: tenantId,
            created_at: { gte: hace30Dias },
        },
        select: { total: true, created_at: true },
        orderBy: { created_at: 'asc' },
    });

    // Agrupar por día
    const ticketPorDia: Record<string, { total: number; count: number }> = {};
    for (let i = 0; i < 30; i++) {
        const fecha = format(subDays(hoy, 29 - i), 'yyyy-MM-dd');
        ticketPorDia[fecha] = { total: 0, count: 0 };
    }

    for (const venta of ventas30d) {
        const fecha = format(venta.created_at, 'yyyy-MM-dd');
        if (ticketPorDia[fecha]) {
            ticketPorDia[fecha].total += Number(venta.total);
            ticketPorDia[fecha].count += 1;
        }
    }

    const ticketPromedio30d = Object.entries(ticketPorDia).map(([fecha, data]) => ({
        fecha,
        ticket_promedio: data.count > 0
            ? Math.round((data.total / data.count) * 100) / 100
            : 0,
    }));

    // ============================================
    // 7. ALERTAS DE QUIEBRE INMINENTE
    // ============================================

    // Calcular velocidad de venta por producto (últimos 30 días)
    const movimientosVenta30d = await db.movimientosInventario.groupBy({
        by: ['producto_id'],
        where: {
            tenant_id: tenantId,
            tipo_movimiento: 'SALIDA_VENTA',
            created_at: { gte: hace30Dias },
        },
        _sum: { cantidad: true },
    });

    const velocidadPorProducto = new Map<number, number>();
    for (const mov of movimientosVenta30d) {
        velocidadPorProducto.set(
            mov.producto_id,
            Number(mov._sum.cantidad ?? 0) / 30
        );
    }

    // Obtener productos con stock bajo vs velocidad
    const productosConStock = await db.productos.findMany({
        where: { tenant_id: tenantId, isActive: true },
        select: { id: true, nombre: true, stock: true },
    });

    const alertasQuiebre = productosConStock
        .map(p => {
            const velocidad = velocidadPorProducto.get(p.id) ?? 0;
            const stock = Number(p.stock);
            const diasRestantes = velocidad > 0 ? stock / velocidad : Infinity;
            return {
                producto_id: p.id,
                producto_nombre: p.nombre,
                stock_actual: stock,
                velocidad_diaria: Math.round(velocidad * 100) / 100,
                dias_restantes: Math.round(diasRestantes * 10) / 10,
            };
        })
        .filter(a => a.dias_restantes < 7 && a.dias_restantes !== Infinity && a.velocidad_diaria > 0)
        .sort((a, b) => a.dias_restantes - b.dias_restantes)
        .slice(0, 10);

    // ============================================
    // 8. TOP DEUDORES
    // ============================================

    const cxcPorCliente = await db.cuentasPorCobrar.groupBy({
        by: ['cliente_id'],
        where: {
            tenant_id: tenantId,
            fecha_vencimiento: { lt: hoy },
            estado: { in: ['VIGENTE', 'VENCIDA'] },
        },
        _sum: { saldo_pendiente: true },
        _min: { fecha_vencimiento: true },
    });

    const clienteIds = cxcPorCliente.map(c => c.cliente_id);
    const clientes = await db.clientes.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, nombre: true, razon_social: true },
    });

    const clientesMap = new Map(clientes.map(c => [c.id, c]));

    const topDeudores = cxcPorCliente
        .map(c => {
            const cliente = clientesMap.get(c.cliente_id);
            const diasVencido = c._min.fecha_vencimiento
                ? differenceInDays(hoy, c._min.fecha_vencimiento)
                : 0;
            return {
                cliente_id: c.cliente_id,
                cliente_nombre: cliente?.razon_social ?? cliente?.nombre ?? `Cliente #${c.cliente_id}`,
                deuda_vencida: Math.round(Number(c._sum.saldo_pendiente ?? 0) * 100) / 100,
                dias_vencido: diasVencido,
            };
        })
        .sort((a, b) => b.deuda_vencida - a.deuda_vencida)
        .slice(0, 5);

    // ============================================
    // 9. PORCENTAJE VENTAS A CRÉDITO
    // ============================================

    const ventasPorCondicion = await db.ventas.groupBy({
        by: ['condicion_pago'],
        where: {
            tenant_id: tenantId,
            created_at: { gte: hace30Dias },
        },
        _sum: { total: true },
    });

    let totalContado = 0;
    let totalCredito = 0;
    for (const v of ventasPorCondicion) {
        if (v.condicion_pago === 'CONTADO') {
            totalContado = Number(v._sum.total ?? 0);
        } else {
            totalCredito = Number(v._sum.total ?? 0);
        }
    }
    const totalVentas = totalContado + totalCredito;
    const porcentajeCredito = totalVentas > 0
        ? Math.round((totalCredito / totalVentas) * 1000) / 10
        : 0;

    return {
        liquidez: {
            en_caja_riesgo: Math.round(enCajaRiesgo * 100) / 100,
            disponible_total: Math.round(disponibleTotal * 100) / 100,
        },
        utilidad_bruta: {
            valor: Math.round(utilidadBruta30d * 100) / 100,
            cambio_porcentual: Math.round(cambioPctUtilidad * 10) / 10,
        },
        cxc_vencidas: {
            valor: Math.round(totalCxcVencidas * 100) / 100,
            cambio_porcentual: Math.round(cambioPctCxc * 10) / 10,
        },
        valor_inventario: Math.round(valorInventario * 100) / 100,
        flujo_caja_30d: flujoCaja30d,
        ticket_promedio_30d: ticketPromedio30d,
        alertas_quiebre: alertasQuiebre,
        top_deudores: topDeudores,
        porcentaje_ventas_credito: porcentajeCredito,
    };
}

// ============================================
// DASHBOARD DE VENTAS (Motor Comercial / Gerente)
// ============================================

export async function generarDashboardVentas(
    tenantId: number,
    fechaInicio?: string,
    fechaFin?: string
): Promise<DashboardVentasResponseDTO> {
    const hoy = new Date();
    const inicio = fechaInicio ? new Date(fechaInicio) : subDays(hoy, 30);
    const fin = fechaFin ? new Date(fechaFin) : hoy;
    const diasPeriodo = differenceInDays(fin, inicio) || 1;
    const inicioPrevio = subDays(inicio, diasPeriodo);

    // ============================================
    // 1. VENTAS TOTALES NETAS
    // ============================================

    const ventasTotales = await db.ventas.aggregate({
        where: {
            tenant_id: tenantId,
            created_at: { gte: inicio, lte: fin },
        },
        _sum: { total: true },
    });
    const totalVentas = Number(ventasTotales._sum.total ?? 0);

    const ventasPrevio = await db.ventas.aggregate({
        where: {
            tenant_id: tenantId,
            created_at: { gte: inicioPrevio, lt: inicio },
        },
        _sum: { total: true },
    });
    const totalPrevio = Number(ventasPrevio._sum.total ?? 0);
    const cambioVentas = totalPrevio > 0
        ? ((totalVentas - totalPrevio) / totalPrevio) * 100
        : 0;

    // ============================================
    // 2. MARGEN PROMEDIO
    // ============================================

    const detalles = await db.ventaDetalles.findMany({
        where: {
            tenant_id: tenantId,
            venta: { created_at: { gte: inicio, lte: fin } },
        },
        select: {
            producto_id: true,
            precio_unitario: true,
            cantidad: true,
            costo_unitario: true, // Costo histórico snapshot
        },
    });

    let totalIngresos = 0;
    let totalCostos = 0;
    for (const d of detalles) {
        const precio = Number(d.precio_unitario);
        const cantidad = Number(d.cantidad);
        const costo = Number(d.costo_unitario ?? 0);
        totalIngresos += precio * cantidad;
        totalCostos += costo * cantidad;
    }

    const margenPromedio = totalIngresos > 0
        ? ((totalIngresos - totalCostos) / totalIngresos) * 100
        : 0;

    // Margen previo
    const detallesPrevio = await db.ventaDetalles.findMany({
        where: {
            tenant_id: tenantId,
            venta: { created_at: { gte: inicioPrevio, lt: inicio } },
        },
        select: { precio_unitario: true, cantidad: true, costo_unitario: true },
    });

    let ingresosPrevio = 0;
    let costosPrevio = 0;
    for (const d of detallesPrevio) {
        ingresosPrevio += Number(d.precio_unitario) * Number(d.cantidad);
        costosPrevio += Number(d.costo_unitario ?? 0) * Number(d.cantidad);
    }
    const margenPrevio = ingresosPrevio > 0
        ? ((ingresosPrevio - costosPrevio) / ingresosPrevio) * 100
        : 0;
    const cambioMargen = margenPrevio > 0
        ? margenPromedio - margenPrevio
        : 0;

    // ============================================
    // 3. TASA DE RECURRENCIA
    // ============================================

    const hace90Dias = subDays(inicio, 90);

    // Clientes que compraron en los últimos 90 días antes del período
    const clientesRecurrentes = await db.ventas.findMany({
        where: {
            tenant_id: tenantId,
            created_at: { gte: hace90Dias, lt: inicio },
            cliente_id: { not: null },
        },
        select: { cliente_id: true },
        distinct: ['cliente_id'],
    });
    const setRecurrentes = new Set(clientesRecurrentes.map(c => c.cliente_id));

    // Ventas del período con cliente
    const ventasConCliente = await db.ventas.findMany({
        where: {
            tenant_id: tenantId,
            created_at: { gte: inicio, lte: fin },
        },
        select: { cliente_id: true, total: true },
    });

    let ventasRecurrentes = 0;
    let ventasTotalesCliente = 0;
    for (const v of ventasConCliente) {
        const monto = Number(v.total);
        ventasTotalesCliente += monto;
        if (v.cliente_id && setRecurrentes.has(v.cliente_id)) {
            ventasRecurrentes += monto;
        }
    }

    const tasaRecurrencia = ventasTotalesCliente > 0
        ? (ventasRecurrentes / ventasTotalesCliente) * 100
        : 0;

    // ============================================
    // 4. TASA DE DEVOLUCIONES
    // ============================================

    const devolucionesTotal = await db.notasCredito.aggregate({
        where: {
            tenant_id: tenantId,
            fecha_emision: { gte: inicio, lte: fin },
            tipo_nota: { in: ['DEVOLUCION_TOTAL', 'DEVOLUCION_PARCIAL'] },
        },
        _sum: { monto_total: true },
    });
    const totalDevoluciones = Number(devolucionesTotal._sum.monto_total ?? 0);
    const tasaDevoluciones = totalVentas > 0
        ? (totalDevoluciones / totalVentas) * 100
        : 0;

    // ============================================
    // 5. TOP ROTACIÓN (Unidades vendidas)
    // ============================================

    const rotacionRaw = await db.ventaDetalles.groupBy({
        by: ['producto_id'],
        where: {
            tenant_id: tenantId,
            venta: { created_at: { gte: inicio, lte: fin } },
        },
        _sum: { cantidad: true },
    });

    const productoIds = rotacionRaw.map(r => r.producto_id);
    const productosInfo = await db.productos.findMany({
        where: { id: { in: productoIds } },
        select: { id: true, nombre: true, costo_compra: true },
    });
    const productosMap = new Map(productosInfo.map(p => [p.id, p]));

    // Enriquecer con ingresos y utilidad
    const detallesPorProducto = new Map<number, { ingresos: number; cantidad: number; costo: number }>();
    for (const d of detalles) {
        const prodId = d.producto_id;
        const current = detallesPorProducto.get(prodId) ?? { ingresos: 0, cantidad: 0, costo: 0 };
        current.ingresos += Number(d.precio_unitario) * Number(d.cantidad);
        current.cantidad += Number(d.cantidad);
        current.costo += Number(d.costo_unitario ?? 0) * Number(d.cantidad);
        detallesPorProducto.set(prodId, current);
    }

    const topRotacion = rotacionRaw
        .map(r => {
            const prod = productosMap.get(r.producto_id);
            const stats = detallesPorProducto.get(r.producto_id);
            const utilidad = (stats?.ingresos ?? 0) - (stats?.costo ?? 0);
            const margen = (stats?.ingresos ?? 0) > 0
                ? (utilidad / (stats?.ingresos ?? 1)) * 100
                : 0;
            return {
                producto_id: r.producto_id,
                producto_nombre: prod?.nombre ?? `Producto #${r.producto_id}`,
                unidades_vendidas: Math.round(Number(r._sum.cantidad ?? 0) * 100) / 100,
                ingresos: Math.round((stats?.ingresos ?? 0) * 100) / 100,
                utilidad: Math.round(utilidad * 100) / 100,
                margen_porcentaje: Math.round(margen * 10) / 10,
            };
        })
        .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)
        .slice(0, 10);

    // ============================================
    // 6. TOP RENTABILIDAD (Utilidad generada)
    // ============================================

    const topRentabilidad = Array.from(detallesPorProducto.entries())
        .map(([prodId, stats]) => {
            const prod = productosMap.get(prodId);
            const utilidad = stats.ingresos - stats.costo;
            const margen = stats.ingresos > 0 ? (utilidad / stats.ingresos) * 100 : 0;
            return {
                producto_id: prodId,
                producto_nombre: prod?.nombre ?? `Producto #${prodId}`,
                unidades_vendidas: Math.round(stats.cantidad * 100) / 100,
                ingresos: Math.round(stats.ingresos * 100) / 100,
                utilidad: Math.round(utilidad * 100) / 100,
                margen_porcentaje: Math.round(margen * 10) / 10,
            };
        })
        .sort((a, b) => b.utilidad - a.utilidad)
        .slice(0, 10);

    // ============================================
    // 7. RANKING DE VENDEDORES
    // ============================================

    const ventasPorVendedor = await db.ventas.findMany({
        where: {
            tenant_id: tenantId,
            created_at: { gte: inicio, lte: fin },
            usuario_id: { not: null },
        },
        include: {
            VentaDetalles: {
                select: { precio_unitario: true, cantidad: true, costo_unitario: true },
            },
            usuario: { select: { id: true, nombre: true, email: true } },
        },
    });

    const vendedoresStats = new Map<number, {
        nombre: string;
        total: number;
        utilidad: number;
        count: number;
    }>();

    for (const venta of ventasPorVendedor) {
        if (!venta.usuario_id) continue;
        const current = vendedoresStats.get(venta.usuario_id) ?? {
            nombre: venta.usuario?.nombre ?? venta.usuario?.email ?? `Usuario #${venta.usuario_id}`,
            total: 0,
            utilidad: 0,
            count: 0,
        };
        current.total += Number(venta.total);
        current.count += 1;
        for (const d of venta.VentaDetalles) {
            const precio = Number(d.precio_unitario) * Number(d.cantidad);
            const costo = Number(d.costo_unitario ?? 0) * Number(d.cantidad);
            current.utilidad += precio - costo;
        }
        vendedoresStats.set(venta.usuario_id, current);
    }

    const rankingVendedores = Array.from(vendedoresStats.entries())
        .map(([userId, stats]) => ({
            usuario_id: userId,
            vendedor_nombre: stats.nombre,
            ventas_total: Math.round(stats.total * 100) / 100,
            utilidad_generada: Math.round(stats.utilidad * 100) / 100,
            cantidad_ventas: stats.count,
        }))
        .sort((a, b) => b.utilidad_generada - a.utilidad_generada);

    // ============================================
    // 8. MAPA DE CALOR HORARIO
    // ============================================

    const ventasPorHora = await db.ventas.findMany({
        where: {
            tenant_id: tenantId,
            created_at: { gte: inicio, lte: fin },
        },
        select: { created_at: true, total: true },
    });

    const mapaCalor: Record<number, { cantidad: number; monto: number }> = {};
    for (let h = 0; h < 24; h++) {
        mapaCalor[h] = { cantidad: 0, monto: 0 };
    }

    for (const v of ventasPorHora) {
        const hora = v.created_at.getHours();
        mapaCalor[hora].cantidad += 1;
        mapaCalor[hora].monto += Number(v.total);
    }

    const mapaCalorHorario = Object.entries(mapaCalor).map(([hora, data]) => ({
        hora: parseInt(hora),
        cantidad_ventas: data.cantidad,
        monto_total: Math.round(data.monto * 100) / 100,
    }));

    // ============================================
    // 9. DISTRIBUCIÓN EFECTIVO VS CRÉDITO
    // ============================================

    const ventasCondicion = await db.ventas.groupBy({
        by: ['condicion_pago'],
        where: {
            tenant_id: tenantId,
            created_at: { gte: inicio, lte: fin },
        },
        _sum: { total: true },
    });

    let efectivo = 0;
    let credito = 0;
    for (const v of ventasCondicion) {
        if (v.condicion_pago === 'CONTADO') {
            efectivo = Number(v._sum.total ?? 0);
        } else {
            credito = Number(v._sum.total ?? 0);
        }
    }
    const totalDist = efectivo + credito;

    return {
        periodo: {
            fecha_inicio: format(inicio, 'yyyy-MM-dd'),
            fecha_fin: format(fin, 'yyyy-MM-dd'),
        },
        ventas_totales_netas: {
            valor: Math.round(totalVentas * 100) / 100,
            cambio_porcentual: Math.round(cambioVentas * 10) / 10,
        },
        margen_promedio: {
            valor: Math.round(margenPromedio * 10) / 10,
            cambio_porcentual: Math.round(cambioMargen * 10) / 10,
        },
        tasa_recurrencia: Math.round(tasaRecurrencia * 10) / 10,
        tasa_devoluciones: Math.round(tasaDevoluciones * 10) / 10,
        top_rotacion: topRotacion,
        top_rentabilidad: topRentabilidad,
        ranking_vendedores: rankingVendedores,
        mapa_calor_horario: mapaCalorHorario,
        distribucion_pago: {
            efectivo: totalDist > 0 ? Math.round((efectivo / totalDist) * 1000) / 10 : 100,
            credito: totalDist > 0 ? Math.round((credito / totalDist) * 1000) / 10 : 0,
        },
    };
}

// Alias para compatibilidad con controllers existentes
export const generarDashboardGeneral_old = generarDashboardGeneral;
export const generarDashboardVentasAnalisis = generarDashboardVentas;
export const generarEstadisticasDashboardVentas = generarDashboardVentas;
