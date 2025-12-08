import { db } from '../config/db';
import { TipoAjuste, Prisma } from '@prisma/client';
import { type CreateInventarioAjusteDTO } from '../dtos/inventario.dto';

/**
 * Obtiene ajustes de inventario con paginación, búsqueda y filtros (SERVER-SIDE)
 */
export const findInventarioAjustesPaginados = async (
  tenantId: number,
  params: {
    skip: number;
    take: number;
    search?: string;
    producto_id?: number;
    tipo?: TipoAjuste;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  const { skip, take, search, producto_id, tipo, fecha_inicio, fecha_fin } = params;

  // Construir condición de búsqueda
  const whereClause: Prisma.InventarioAjustesWhereInput = {
    tenant_id: tenantId,
    ...(producto_id && { producto_id }),
    ...(tipo && { tipo }),
    ...(fecha_inicio && { created_at: { gte: fecha_inicio } }),
    ...(fecha_fin && { created_at: { lte: fecha_fin } }),
    ...(search && {
      OR: [
        { producto: { nombre: { contains: search } } },
        { producto: { sku: { contains: search } } },
        { motivo: { contains: search } },
      ],
    }),
  };

  // Ejecutar dos consultas en transacción
  const [total, data] = await db.$transaction([
    db.inventarioAjustes.count({ where: whereClause }),
    db.inventarioAjustes.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        producto: { select: { id: true, nombre: true, sku: true, stock: true } },
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    }),
  ]);

  return { total, data };
};

/**
 * Obtiene todos los ajustes de inventario de un tenant con filtros opcionales
 * @deprecated Usar findInventarioAjustesPaginados para listas grandes
 */
export const findAllInventarioAjustesByTenant = async (
  tenantId: number,
  filters?: {
    producto_id?: number;
    tipo?: TipoAjuste;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  return db.inventarioAjustes.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters?.producto_id && { producto_id: filters.producto_id }),
      ...(filters?.tipo && { tipo: filters.tipo }),
      ...(filters?.fecha_inicio && {
        created_at: { gte: filters.fecha_inicio },
      }),
      ...(filters?.fecha_fin && {
        created_at: { lte: filters.fecha_fin },
      }),
    },
    orderBy: { created_at: 'desc' },
    include: {
      producto: { select: { id: true, nombre: true, sku: true, stock: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });
};

/**
 * Busca un ajuste de inventario por ID validando pertenencia al tenant
 */
export const findInventarioAjusteByIdAndTenant = async (
  tenantId: number,
  id: number
) => {
  return db.inventarioAjustes.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      producto: { select: { id: true, nombre: true, sku: true, stock: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });
};

/**
 * Crea un nuevo ajuste de inventario y actualiza el stock del producto (transacción)
 */
export const createInventarioAjuste = async (
  data: CreateInventarioAjusteDTO,
  tenantId: number,
  usuarioId?: number
) => {
  return db.$transaction(async (tx) => {
    // Verificar que el producto existe y pertenece al tenant
    const producto = await tx.productos.findFirst({
      where: { id: data.producto_id, tenant_id: tenantId },
      select: { id: true, nombre: true, stock: true },
    });

    if (!producto) {
      const err = new Error(
        `Producto con ID ${data.producto_id} no encontrado en este tenant`
      );
      (err as any).code = 'PRODUCTO_NOT_FOUND';
      throw err;
    }

    // Validar que no se pueda hacer salida si no hay stock suficiente
    if (data.tipo === 'salida' && Number(producto.stock) < Number(data.cantidad)) {
      const err = new Error(
        `Stock insuficiente para ajuste de salida. Stock actual: ${producto.stock}, Cantidad solicitada: ${data.cantidad}`
      );
      (err as any).code = 'STOCK_INSUFICIENTE';
      throw err;
    }

    // Crear el ajuste
    const nuevoAjuste = await tx.inventarioAjustes.create({
      data: {
        tenant_id: tenantId,
        producto_id: data.producto_id,
        tipo: data.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo,
        usuario_id: usuarioId ?? null,
      },
    });

    // Actualizar stock del producto según el tipo de ajuste
    if (data.tipo === 'entrada') {
      await tx.productos.update({
        where: { id: data.producto_id },
        data: {
          stock: {
            increment: data.cantidad,
          },
        },
      });
    } else if (data.tipo === 'salida') {
      await tx.productos.update({
        where: { id: data.producto_id },
        data: {
          stock: {
            decrement: data.cantidad,
          },
        },
      });
    }

    return nuevoAjuste;
  });
};

/**
 * Elimina un ajuste de inventario
 * NOTA: En producción considerar NO permitir eliminación o implementar soft delete
 * y reversar el ajuste de stock
 */
export const deleteInventarioAjusteByIdAndTenant = async (
  tenantId: number,
  id: number
) => {
  const existing = await db.inventarioAjustes.findFirst({
    where: { id, tenant_id: tenantId },
  });
  if (!existing) return null;

  // NOTA: Al eliminar NO se reversa el stock automáticamente
  // Considerar implementar lógica de reversa si es necesario
  return db.inventarioAjustes.delete({ where: { id } });
};
