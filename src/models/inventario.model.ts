import { db } from '../config/db';
import { TipoMovimientoInventario, Prisma } from '@prisma/client';
import * as inventarioService from '../services/inventario.service';

/**
 * DTO para crear ajuste de inventario (compatible con API existente)
 */
export interface CreateInventarioAjusteDTO {
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo: string;
}

/**
 * Obtiene movimientos de inventario con paginación, búsqueda y filtros (SERVER-SIDE)
 * 
 * Nota: Reemplaza la tabla InventarioAjustes eliminada. Ahora consulta MovimientosInventario
 * y filtra por tipos de ajuste (ENTRADA_AJUSTE, SALIDA_AJUSTE).
 */
export const findInventarioAjustesPaginados = async (
  tenantId: number,
  params: {
    skip: number;
    take: number;
    search?: string;
    producto_id?: number;
    tipo?: 'entrada' | 'salida';
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  const { skip, take, search, producto_id, tipo, fecha_inicio, fecha_fin } = params;

  // Mapear tipo legacy a nuevo enum
  const tiposMovimiento: TipoMovimientoInventario[] = tipo === 'entrada'
    ? ['ENTRADA_AJUSTE']
    : tipo === 'salida'
      ? ['SALIDA_AJUSTE']
      : ['ENTRADA_AJUSTE', 'SALIDA_AJUSTE'];

  // Construir condición de búsqueda
  const whereClause: Prisma.MovimientosInventarioWhereInput = {
    tenant_id: tenantId,
    tipo_movimiento: { in: tiposMovimiento },
    ajuste_manual: true, // Solo ajustes manuales
    ...(producto_id && { producto_id }),
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
    db.movimientosInventario.count({ where: whereClause }),
    db.movimientosInventario.findMany({
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

  // Mapear a formato compatible con API existente
  const mappedData = data.map(mov => ({
    id: mov.id,
    tipo: mov.tipo_movimiento === 'ENTRADA_AJUSTE' ? 'entrada' : 'salida',
    cantidad: mov.cantidad,
    motivo: mov.motivo,
    created_at: mov.created_at,
    producto: mov.producto,
    usuario: mov.usuario,
    // Campos adicionales del Kardex
    saldo_anterior: mov.saldo_anterior,
    saldo_nuevo: mov.saldo_nuevo,
  }));

  return { total, data: mappedData };
};

/**
 * Busca un movimiento de inventario por ID validando pertenencia al tenant
 */
export const findInventarioAjusteByIdAndTenant = async (
  tenantId: number,
  id: number
) => {
  const mov = await db.movimientosInventario.findFirst({
    where: {
      id,
      tenant_id: tenantId,
      ajuste_manual: true, // Solo ajustes manuales
    },
    include: {
      producto: { select: { id: true, nombre: true, sku: true, stock: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });

  if (!mov) return null;

  // Mapear a formato compatible
  return {
    id: mov.id,
    tipo: mov.tipo_movimiento === 'ENTRADA_AJUSTE' ? 'entrada' : 'salida',
    cantidad: mov.cantidad,
    motivo: mov.motivo,
    created_at: mov.created_at,
    producto: mov.producto,
    usuario: mov.usuario,
    saldo_anterior: mov.saldo_anterior,
    saldo_nuevo: mov.saldo_nuevo,
  };
};

/**
 * Crea un nuevo ajuste de inventario usando el servicio centralizado (Kardex)
 * 
 * Esta función mantiene la API compatible con el frontend existente pero
 * internamente usa el sistema Kardex con bloqueo optimista.
 */
export const createInventarioAjuste = async (
  data: CreateInventarioAjusteDTO,
  tenantId: number,
  usuarioId?: number
) => {
  return db.$transaction(async (tx) => {
    // Determinar tipo de movimiento
    const tipoMovimiento: TipoMovimientoInventario =
      data.tipo === 'entrada' ? 'ENTRADA_AJUSTE' : 'SALIDA_AJUSTE';

    // Usar servicio centralizado para registrar movimiento
    // El servicio ya valida stock y maneja bloqueo optimista
    const resultado = await inventarioService.registrarMovimiento(tx, {
      tenantId,
      productoId: data.producto_id,
      tipo: tipoMovimiento,
      cantidad: Number(data.cantidad),
      ajusteManual: true,
      motivo: data.motivo,
      usuarioId,
    });

    // Obtener el movimiento completo para devolverlo
    const movimiento = await tx.movimientosInventario.findUnique({
      where: { id: resultado.id },
    });

    // Devolver en formato compatible con API existente
    return {
      id: movimiento!.id,
      tipo: data.tipo,
      cantidad: movimiento!.cantidad,
      motivo: movimiento!.motivo,
      created_at: movimiento!.created_at,
      producto_id: data.producto_id,
      saldo_anterior: movimiento!.saldo_anterior,
      saldo_nuevo: movimiento!.saldo_nuevo,
    };
  });
};

/**
 * Los ajustes de inventario NO se pueden eliminar en un ERP.
 * Esta función se mantiene por compatibilidad pero lanza error.
 * 
 * Para "corregir" un ajuste, se debe crear un ajuste inverso.
 */
export const deleteInventarioAjusteByIdAndTenant = async (
  tenantId: number,
  id: number
): Promise<null> => {
  // Verificar que existe
  const existing = await db.movimientosInventario.findFirst({
    where: { id, tenant_id: tenantId, ajuste_manual: true },
  });

  if (!existing) return null;

  // Los movimientos de inventario son inmutables en un ERP
  const err = new Error(
    'Los ajustes de inventario no pueden eliminarse. ' +
    'Para corregir un error, cree un ajuste inverso (contraajuste).'
  );
  (err as any).code = 'MOVIMIENTO_INMUTABLE';
  throw err;
};
