/**
 * HELPER DE SERIES
 * 
 * Funciones reutilizables para obtener series activas y generar correlativos
 * siguiendo el principio DRY (Don't Repeat Yourself)
 */

import { db } from '../config/db';
import { Series_tipo_comprobante } from '@prisma/client';

/**
 * Obtiene una serie activa para un tipo de comprobante
 * 
 * @param tenantId - ID del tenant
 * @param tipoComprobante - Tipo de comprobante (FACTURA, BOLETA, NOTA_CREDITO, etc.)
 * @param cajaId - ID de la caja (opcional, solo para ventas POS)
 * @param tx - Transacción de Prisma (opcional, para operaciones atómicas)
 * @returns Serie activa con su correlativo actual
 * @throws Error si no encuentra serie activa
 */
export async function obtenerSerieActiva(
  tenantId: number,
  tipoComprobante: Series_tipo_comprobante,
  cajaId?: number,
  tx?: any
) {
  const prisma = tx || db;
  
  const where: any = {
    tenant_id: tenantId,
    tipo_comprobante: tipoComprobante,
    isActive: true,
  };
  
  // Filtrar por caja solo si se proporciona (ventas POS)
  if (cajaId) {
    where.caja_id = cajaId;
  }
  
  const serie = await prisma.series.findFirst({
    where,
    orderBy: { id: 'asc' }, // Si hay múltiples, tomar la primera
  });
  
  if (!serie) {
    const mensaje = cajaId
      ? `No existe una serie activa para comprobantes tipo ${tipoComprobante} asignada a esta caja.`
      : `No existe una serie activa para comprobantes tipo ${tipoComprobante}.`;
    
    const err = new Error(mensaje + ' Por favor, configure las series en Administración → Series SUNAT.');
    (err as any).code = 'SERIE_NOT_FOUND';
    throw err;
  }
  
  return serie;
}

/**
 * Incrementa el correlativo de una serie de forma atómica
 * 
 * @param serieId - ID de la serie
 * @param tx - Transacción de Prisma (requerida para garantizar atomicidad)
 * @returns Nuevo correlativo
 */
export async function incrementarCorrelativo(
  serieId: number,
  tx: any
): Promise<number> {
  // Incrementar correlativo de forma atómica
  const serieActualizada = await tx.series.update({
    where: { id: serieId },
    data: {
      correlativo_actual: {
        increment: 1,
      },
    },
  });
  
  return serieActualizada.correlativo_actual;
}

/**
 * Determina el tipo de comprobante para una Nota de Crédito
 * basándose en el tipo de comprobante original
 * 
 * @param tipoComprobanteOriginal - Tipo de comprobante de la venta original
 * @returns TipoComprobante.NOTA_CREDITO (todas las NC usan el mismo tipo)
 */
export function obtenerTipoComprobanteNC(
  tipoComprobanteOriginal: Series_tipo_comprobante
): Series_tipo_comprobante {
  // En Perú, todas las Notas de Crédito usan el mismo tipo
  // independientemente de si anulan una Factura o Boleta
  return Series_tipo_comprobante.NOTA_CREDITO;
}
