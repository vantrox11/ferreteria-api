import { db } from '../config/db';

/**
 * Genera el Kardex completo de un producto (Ventas + Compras + Ajustes)
 * Retorna todos los movimientos ordenados cronológicamente
 */
export const generarKardexCompleto = async (
  tenantId: number,
  productoId: number
) => {
  // Verificar que el producto existe
  const producto = await db.productos.findFirst({
    where: { id: productoId, tenant_id: tenantId, isActive: true },
    select: { id: true, nombre: true, sku: true, stock: true },
  });

  if (!producto) return null;

  // 1. Obtener ventas (salidas) - con información fiscal completa
  const ventas = await db.ventaDetalles.findMany({
    where: {
      producto_id: productoId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      cantidad: true,
      precio_unitario: true,
      venta: {
        select: {
          id: true,
          created_at: true,
          numero_comprobante: true,
          serie: {
            select: { codigo: true },
          },
          cliente: {
            select: {
              nombre: true,
              documento_identidad: true,
            },
          },
        },
      },
    },
  });

  // 2. Obtener compras (entradas) - con información fiscal completa
  const compras = await db.ordenCompraDetalles.findMany({
    where: {
      producto_id: productoId,
      tenant_id: tenantId,
      orden_compra: {
        estado: 'recibida', // Solo órdenes recibidas afectan el kardex
      },
    },
    select: {
      id: true,
      cantidad: true,
      costo_unitario: true,
      orden_compra: {
        select: {
          id: true,
          fecha_recepcion: true,
          serie: true,
          numero: true,
          proveedor: {
            select: {
              nombre: true,
              ruc_identidad: true,
            },
          },
        },
      },
    },
  });

  // 3. Obtener ajustes manuales desde MovimientosInventario (entradas/salidas)
  const ajustes = await db.movimientosInventario.findMany({
    where: {
      producto_id: productoId,
      tenant_id: tenantId,
      ajuste_manual: true, // FK explícita para ajustes manuales
    },
    select: {
      id: true,
      tipo_movimiento: true,
      cantidad: true,
      motivo: true,
      created_at: true,
      usuario: {
        select: { id: true, nombre: true, email: true },
      },
    },
  });

  // 4. Unificar movimientos en un solo array con tipo discriminado
  type MovimientoKardex = {
    fecha: Date;
    tipo: 'venta' | 'compra' | 'ajuste_entrada' | 'ajuste_salida' | 'devolucion_entrada' | 'devolucion_salida';
    cantidad: number;
    referencia: string;
    tercero?: string;
    tercero_documento?: string; // RUC/DNI del cliente o proveedor
    motivo?: string;
    responsable?: string;
    precio_unitario?: number;
  };

  const movimientos: MovimientoKardex[] = [];

  // Mapear ventas con formato fiscal
  ventas.forEach((v) => {
    // Formato: B001-000045 (serie-numero)
    const referencia = v.venta.serie?.codigo && v.venta.numero_comprobante
      ? `${v.venta.serie.codigo}-${String(v.venta.numero_comprobante).padStart(6, '0')}`
      : `Venta #${v.venta.id}`;

    movimientos.push({
      fecha: v.venta.created_at,
      tipo: 'venta',
      cantidad: Number(v.cantidad),
      referencia,
      tercero: v.venta.cliente?.nombre || 'Cliente desconocido',
      tercero_documento: v.venta.cliente?.documento_identidad || undefined,
      precio_unitario: Number(v.precio_unitario),
    });
  });

  // Mapear compras con formato fiscal
  compras.forEach((c) => {
    // Formato: F005-000345 (serie-numero del proveedor)
    const referencia = c.orden_compra.serie && c.orden_compra.numero
      ? `${c.orden_compra.serie}-${c.orden_compra.numero}`
      : `Compra #${c.orden_compra.id}`;

    movimientos.push({
      fecha: c.orden_compra.fecha_recepcion || new Date(),
      tipo: 'compra',
      cantidad: Number(c.cantidad),
      referencia,
      tercero: c.orden_compra.proveedor?.nombre || 'Proveedor desconocido',
      tercero_documento: c.orden_compra.proveedor?.ruc_identidad || undefined,
      precio_unitario: Number(c.costo_unitario),
    });
  });

  // Mapear ajustes y devoluciones con tipo correcto
  ajustes.forEach((a) => {
    // Formato: ADJ-{id} para ajustes, DEV-{id} para devoluciones
    const esDevolucion = a.tipo_movimiento === 'ENTRADA_DEVOLUCION' || a.tipo_movimiento === 'SALIDA_DEVOLUCION';
    const referencia = esDevolucion
      ? `DEV-${String(a.id).padStart(4, '0')}`
      : `ADJ-${String(a.id).padStart(4, '0')}`;

    // Mapear tipo según el movimiento
    let tipo: MovimientoKardex['tipo'];
    switch (a.tipo_movimiento) {
      case 'ENTRADA_AJUSTE':
        tipo = 'ajuste_entrada';
        break;
      case 'SALIDA_AJUSTE':
        tipo = 'ajuste_salida';
        break;
      case 'ENTRADA_DEVOLUCION':
        tipo = 'devolucion_entrada';
        break;
      case 'SALIDA_DEVOLUCION':
        tipo = 'devolucion_salida';
        break;
      default:
        tipo = 'ajuste_salida'; // Fallback
    }

    movimientos.push({
      fecha: a.created_at,
      tipo,
      cantidad: Number(a.cantidad),
      referencia,
      motivo: a.motivo || undefined,
      responsable: a.usuario?.nombre || a.usuario?.email || 'Usuario desconocido',
    });
  });

  // 5. Ordenar por fecha descendente (más reciente primero)
  movimientos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  // 6. Calcular saldo acumulado (stock) en cada momento
  // Empezamos desde el stock actual y vamos hacia atrás
  let saldoActual = Number(producto.stock);
  const movimientosConSaldo = movimientos.map((mov) => {
    const saldoAnterior = saldoActual;

    // Revertir el movimiento para obtener el saldo anterior
    // Salidas reducen stock: venta, ajuste_salida, devolucion_salida
    // Entradas aumentan stock: compra, ajuste_entrada, devolucion_entrada
    const esSalida = mov.tipo === 'venta' || mov.tipo === 'ajuste_salida' || mov.tipo === 'devolucion_salida';
    if (esSalida) {
      saldoActual += Number(mov.cantidad); // Era mayor antes de la salida
    } else {
      saldoActual -= Number(mov.cantidad); // Era menor antes de la entrada
    }

    return {
      ...mov,
      saldo: saldoAnterior,
    };
  });

  // Revertir para mostrar en orden cronológico ascendente (del más antiguo al más nuevo)
  const movimientosOrdenados = movimientosConSaldo.reverse();

  return {
    producto,
    stockActual: producto.stock,
    totalMovimientos: movimientos.length,
    movimientos: movimientosOrdenados,
  };
};
