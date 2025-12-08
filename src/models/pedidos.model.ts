import { db } from '../config/db';
import { Prisma, EstadoPedido } from '@prisma/client';

/**
 * Lista pedidos por tenant con filtro opcional por estado
 */
export const findAllPedidosByTenant = async (
  tenantId: number,
  estado?: EstadoPedido
) => {
  return db.pedidos.findMany({
    where: {
      tenant_id: tenantId,
      ...(estado && { estado }),
    },
    orderBy: { created_at: 'desc' },
    include: {
      cliente: { select: { id: true, nombre: true } },
    },
  });
};

/**
 * Obtiene un pedido con sus detalles y productos (incluye stock actual)
 */
export const findPedidoByIdAndTenantWithDetalles = async (
  tenantId: number,
  id: number
) => {
  return db.pedidos.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      cliente: { select: { id: true, nombre: true } },
      detalles: {
        include: {
          producto: { select: { id: true, nombre: true, stock: true, precio_base: true } },
        },
      },
    },
  });
};

/**
 * Cambia el estado de un pedido, validando pertenencia al tenant
 */
export const updatePedidoEstadoByIdAndTenant = async (
  tenantId: number,
  id: number,
  nuevoEstado: EstadoPedido,
  usuarioGestionId?: number
) => {
  const existing = await db.pedidos.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.pedidos.update({
    where: { id },
    data: {
      estado: nuevoEstado,
      usuario_gestion_id: usuarioGestionId ?? existing.usuario_gestion_id,
    },
  });
};

/**
 * Genera una venta desde un pedido (transacción), si no existe ya.
 * No modifica el estado del pedido; vincula venta con `pedido_origen_id`.
 */
export const generarVentaDesdePedido = async (
  tenantId: number,
  pedidoId: number,
  usuarioId?: number,
  metodoPago?: string
) => {
  // Verificar existencia de pedido y detalles
  const pedido = await db.pedidos.findFirst({
    where: { id: pedidoId, tenant_id: tenantId },
    include: {
      cliente: true,
      detalles: {
        include: { producto: { select: { id: true, precio_base: true } } },
      },
    },
  });
  if (!pedido) return null;

  // verificar si ya tiene venta generada
  const existente = await db.ventas.findFirst({
    where: { tenant_id: tenantId, pedido_origen_id: pedidoId },
    select: { id: true },
  });
  if (existente) {
    const err = new Error('Ya existe una venta generada para este pedido');
    (err as any).code = 'VENTA_EXISTENTE';
    throw err;
  }

  // Calcular total
  const total = pedido.detalles.reduce((acc: number, det: any) => {
    const precio = Number(det.producto.precio_base);
    return acc + precio * Number(det.cantidad);
  }, 0);

  // Transacción: crear venta y detalles
  const venta = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const nuevaVenta = await tx.ventas.create({
      data: {
        total: new Prisma.Decimal(total),
        metodo_pago: metodoPago ?? null,
        tenant_id: tenantId,
        cliente_id: pedido.cliente_id ?? null,
        usuario_id: usuarioId ?? null,
        pedido_origen_id: pedidoId,
      },
    });

    if (pedido.detalles && pedido.detalles.length > 0) {
      await tx.ventaDetalles.createMany({
        data: pedido.detalles.map((det: any) => ({
          cantidad: det.cantidad,
          valor_unitario: det.producto.precio_base as any,
          precio_unitario: det.producto.precio_base as any,
          igv_total: 0,
          tasa_igv: 0,
          tenant_id: tenantId,
          venta_id: nuevaVenta.id,
          producto_id: det.producto_id,
        })),
      });
    }

    return nuevaVenta;
  });

  return venta;
};