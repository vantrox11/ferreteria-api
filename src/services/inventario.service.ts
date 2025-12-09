import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { NotFoundError, StockInsuficienteError, ConcurrencyError, AppError } from '../utils/app-error';
import { db, dbBase } from '../config/db';

/**
 * Servicio centralizado de inventario con bloqueo optimista.
 * 
 * Este servicio es la ÚNICA forma de modificar el stock de productos.
 * Garantiza:
 * - Trazabilidad completa (Kardex inmutable)
 * - Prevención de condiciones de carrera (bloqueo optimista)
 * - Validación de stock suficiente para salidas
 */

export interface RegistrarMovimientoParams {
    tenantId: number;
    productoId: number;
    tipo: TipoMovimientoInventario;
    cantidad: number;
    costoUnitario?: number;
    // FKs explícitas (usar solo una según el tipo de documento)
    ventaId?: number;
    ordenCompraId?: number;
    notaCreditoId?: number;
    ajusteManual?: boolean; // true para ajustes sin documento asociado
    motivo?: string;
    usuarioId?: number;
}

export interface MovimientoRegistrado {
    id: number;
    saldoAnterior: number;
    saldoNuevo: number;
    version: number;
}

/**
 * Determina si el tipo de movimiento es una entrada (aumenta stock).
 */
const esEntrada = (tipo: TipoMovimientoInventario): boolean => {
    return tipo === 'ENTRADA_COMPRA' ||
        tipo === 'ENTRADA_AJUSTE' ||
        tipo === 'ENTRADA_DEVOLUCION';
};

/**
 * Registra un movimiento de inventario de forma atómica con bloqueo optimista.
 * 
 * IMPORTANTE: Esta función DEBE llamarse dentro de una transacción Prisma existente.
 * 
 * @throws Error si el producto no existe
 * @throws Error si stock insuficiente para salidas
 * @throws Error si hay conflicto de concurrencia (version mismatch)
 */
export const registrarMovimiento = async (
    tx: Prisma.TransactionClient,
    params: RegistrarMovimientoParams
): Promise<MovimientoRegistrado> => {
    const {
        tenantId,
        productoId,
        tipo,
        cantidad,
        costoUnitario,
        ventaId,
        ordenCompraId,
        notaCreditoId,
        ajusteManual,
        motivo,
        usuarioId,
    } = params;

    // 1. Obtener producto con su version actual
    const producto = await tx.productos.findFirst({
        where: { id: productoId, tenant_id: tenantId },
        select: { id: true, nombre: true, stock: true, version: true },
    });

    if (!producto) {
        throw new NotFoundError('Producto', productoId);
    }

    const stockActual = Number(producto.stock);
    const cantidadNum = Number(cantidad);

    // 2. Calcular nuevo saldo
    const nuevoSaldo = esEntrada(tipo)
        ? stockActual + cantidadNum
        : stockActual - cantidadNum;

    // 3. Validar stock suficiente para salidas
    if (!esEntrada(tipo) && nuevoSaldo < 0) {
        throw new StockInsuficienteError(producto.nombre, stockActual, cantidadNum);
    }

    // 4. Actualizar stock con bloqueo optimista (verificar version)
    const updateResult = await tx.productos.updateMany({
        where: {
            id: productoId,
            tenant_id: tenantId,
            version: producto.version, // Bloqueo optimista
        },
        data: {
            stock: nuevoSaldo,
            version: { increment: 1 },
        },
    });

    // Si no se actualizó ningún registro, hubo conflicto de concurrencia
    if (updateResult.count === 0) {
        throw new ConcurrencyError(`stock de "${producto.nombre}"`);
    }

    // 5. Crear registro inmutable en MovimientosInventario (Kardex)
    const movimiento = await tx.movimientosInventario.create({
        data: {
            tenant_id: tenantId,
            producto_id: productoId,
            tipo_movimiento: tipo,
            cantidad: cantidadNum,
            saldo_anterior: stockActual,
            saldo_nuevo: nuevoSaldo,
            costo_unitario: costoUnitario ?? null,
            // FKs explícitas para integridad referencial
            venta_id: ventaId ?? null,
            orden_compra_id: ordenCompraId ?? null,
            nota_credito_id: notaCreditoId ?? null,
            ajuste_manual: ajusteManual ?? false,
            motivo: motivo ?? null,
            usuario_id: usuarioId ?? null,
        },
    });

    return {
        id: movimiento.id,
        saldoAnterior: stockActual,
        saldoNuevo: nuevoSaldo,
        version: producto.version + 1,
    };
};

/**
 * Registra múltiples movimientos de inventario para varios productos.
 * Útil para ventas con múltiples items o recepciones de compra.
 * 
 * @throws Error si algún producto tiene stock insuficiente (toda la operación se revierte)
 */
export const registrarMovimientosMultiples = async (
    tx: Prisma.TransactionClient,
    movimientos: RegistrarMovimientoParams[]
): Promise<MovimientoRegistrado[]> => {
    const resultados: MovimientoRegistrado[] = [];

    for (const mov of movimientos) {
        const resultado = await registrarMovimiento(tx, mov);
        resultados.push(resultado);
    }

    return resultados;
};

/**
 * Helper: Crea un movimiento de salida por venta.
 */
export const crearSalidaVenta = (
    tenantId: number,
    productoId: number,
    cantidad: number,
    ventaId: number,
    usuarioId?: number
): RegistrarMovimientoParams => ({
    tenantId,
    productoId,
    tipo: 'SALIDA_VENTA',
    cantidad,
    ventaId,
    usuarioId,
});

/**
 * Helper: Crea un movimiento de entrada por compra.
 */
export const crearEntradaCompra = (
    tenantId: number,
    productoId: number,
    cantidad: number,
    costoUnitario: number,
    ordenCompraId: number,
    usuarioId?: number
): RegistrarMovimientoParams => ({
    tenantId,
    productoId,
    tipo: 'ENTRADA_COMPRA',
    cantidad,
    costoUnitario,
    ordenCompraId,
    usuarioId,
});

/**
 * Helper: Crea un movimiento de ajuste manual.
 */
export const crearAjusteInventario = (
    tenantId: number,
    productoId: number,
    esEntradaAjuste: boolean,
    cantidad: number,
    motivo: string,
    usuarioId?: number
): RegistrarMovimientoParams => ({
    tenantId,
    productoId,
    tipo: esEntradaAjuste ? 'ENTRADA_AJUSTE' : 'SALIDA_AJUSTE',
    cantidad,
    ajusteManual: true,
    motivo,
    usuarioId,
});

/**
 * Helper: Crea un movimiento de entrada por devolución (nota de crédito).
 */
export const crearEntradaDevolucion = (
    tenantId: number,
    productoId: number,
    cantidad: number,
    notaCreditoId: number,
    usuarioId?: number
): RegistrarMovimientoParams => ({
    tenantId,
    productoId,
    tipo: 'ENTRADA_DEVOLUCION',
    cantidad,
    notaCreditoId,
    usuarioId,
});

// ============================================
// FUNCIONES DE AJUSTES DE INVENTARIO
// (Migradas desde inventario.model.ts)
// ============================================

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
    const [total, data] = await dbBase.$transaction([
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
    return dbBase.$transaction(async (tx) => {
        // Determinar tipo de movimiento
        const tipoMovimiento: TipoMovimientoInventario =
            data.tipo === 'entrada' ? 'ENTRADA_AJUSTE' : 'SALIDA_AJUSTE';

        // Usar función registrarMovimiento del mismo módulo
        const resultado = await registrarMovimiento(tx, {
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
    throw new AppError(
        'Los ajustes de inventario no pueden eliminarse. Para corregir un error, cree un ajuste inverso (contraajuste).',
        'MOVIMIENTO_INMUTABLE',
        400
    );
};
