import { Prisma, TipoMovimientoInventario } from '@prisma/client';

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
    referenciaTipo: 'VENTA' | 'COMPRA' | 'AJUSTE' | 'NOTA_CREDITO' | 'DEVOLUCION';
    referenciaId: number;
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
        referenciaTipo,
        referenciaId,
        motivo,
        usuarioId,
    } = params;

    // 1. Obtener producto con su version actual
    const producto = await tx.productos.findFirst({
        where: { id: productoId, tenant_id: tenantId },
        select: { id: true, nombre: true, stock: true, version: true },
    });

    if (!producto) {
        const err = new Error(`Producto con ID ${productoId} no encontrado en este tenant`);
        (err as any).code = 'PRODUCTO_NOT_FOUND';
        throw err;
    }

    const stockActual = Number(producto.stock);
    const cantidadNum = Number(cantidad);

    // 2. Calcular nuevo saldo
    const nuevoSaldo = esEntrada(tipo)
        ? stockActual + cantidadNum
        : stockActual - cantidadNum;

    // 3. Validar stock suficiente para salidas
    if (!esEntrada(tipo) && nuevoSaldo < 0) {
        const err = new Error(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${stockActual}, Requerido: ${cantidadNum}`
        );
        (err as any).code = 'STOCK_INSUFICIENTE';
        throw err;
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
        const err = new Error(
            `Conflicto de concurrencia al actualizar stock de "${producto.nombre}". ` +
            'Otro usuario modificó el inventario. Por favor, intente nuevamente.'
        );
        (err as any).code = 'CONCURRENCY_CONFLICT';
        throw err;
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
            referencia_tipo: referenciaTipo,
            referencia_id: referenciaId,
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
    referenciaTipo: 'VENTA',
    referenciaId: ventaId,
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
    referenciaTipo: 'COMPRA',
    referenciaId: ordenCompraId,
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
    ajusteId: number,
    usuarioId?: number
): RegistrarMovimientoParams => ({
    tenantId,
    productoId,
    tipo: esEntradaAjuste ? 'ENTRADA_AJUSTE' : 'SALIDA_AJUSTE',
    cantidad,
    referenciaTipo: 'AJUSTE',
    referenciaId: ajusteId,
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
    referenciaTipo: 'NOTA_CREDITO',
    referenciaId: notaCreditoId,
    usuarioId,
});
