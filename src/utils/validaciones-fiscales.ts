/**
 * VALIDACIONES FISCALES - FASE 2.1
 * 
 * Validaciones de negocio para cumplir con normativa SUNAT
 */

import { TipoDocumento } from '@prisma/client';

export interface Proveedor {
  id: number;
  nombre: string;
  ruc_identidad: string;
  tipo_documento: TipoDocumento;
}

export class ValidationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Valida que un proveedor pueda emitir factura
 * Según SUNAT, solo proveedores con RUC pueden emitir facturas
 */
export function validarProveedorParaFactura(proveedor: Proveedor): void {
  if (proveedor.tipo_documento !== 'RUC') {
    throw new ValidationError(
      `No se puede crear FACTURA. El proveedor "${proveedor.nombre}" tiene ${proveedor.tipo_documento} pero debe tener RUC para emitir facturas.`,
      'PROVEEDOR_SIN_RUC_PARA_FACTURA'
    );
  }

  // Validar formato de RUC (11 dígitos)
  if (!/^\d{11}$/.test(proveedor.ruc_identidad)) {
    throw new ValidationError(
      `RUC inválido: "${proveedor.ruc_identidad}". Debe tener 11 dígitos numéricos.`,
      'RUC_FORMATO_INVALIDO'
    );
  }
}

/**
 * Valida el formato de serie de comprobante
 * Formato esperado: Letra(s) seguidas de números (ej: F001, B002, FE01)
 */
export function validarFormatoSerie(serie: string): void {
  if (!serie || serie.trim().length === 0) {
    throw new ValidationError(
      'La serie del comprobante es obligatoria',
      'SERIE_VACIA'
    );
  }

  if (serie.length > 10) {
    throw new ValidationError(
      `Serie "${serie}" demasiado larga. Máximo 10 caracteres.`,
      'SERIE_DEMASIADO_LARGA'
    );
  }

  // Validar formato alfanumérico
  if (!/^[A-Za-z0-9-]+$/.test(serie)) {
    throw new ValidationError(
      `Serie "${serie}" contiene caracteres inválidos. Solo se permiten letras, números y guiones.`,
      'SERIE_FORMATO_INVALIDO'
    );
  }
}

/**
 * Valida el formato de número de comprobante
 * Debe ser numérico y tener longitud razonable
 */
export function validarFormatoNumero(numero: string): void {
  if (!numero || numero.trim().length === 0) {
    throw new ValidationError(
      'El número del comprobante es obligatorio',
      'NUMERO_VACIO'
    );
  }

  if (numero.length > 20) {
    throw new ValidationError(
      `Número "${numero}" demasiado largo. Máximo 20 caracteres.`,
      'NUMERO_DEMASIADO_LARGO'
    );
  }

  // Validar que sea numérico o alfanumérico
  if (!/^[A-Za-z0-9-]+$/.test(numero)) {
    throw new ValidationError(
      `Número "${numero}" contiene caracteres inválidos.`,
      'NUMERO_FORMATO_INVALIDO'
    );
  }
}

/**
 * Valida la tasa de IGV
 * Debe ser 18% o 0% (exonerado/inafecto)
 */
export function validarTasaIGV(tasa: number): void {
  const tasasPermitidas = [0, 18];
  
  if (!tasasPermitidas.includes(tasa)) {
    throw new ValidationError(
      `Tasa de IGV ${tasa}% no válida. Solo se permite 0% o 18%.`,
      'TASA_IGV_INVALIDA'
    );
  }
}

/**
 * Valida que una fecha de emisión no sea futura
 */
export function validarFechaEmision(fechaEmision: Date): void {
  const ahora = new Date();
  
  if (fechaEmision > ahora) {
    throw new ValidationError(
      'La fecha de emisión no puede ser futura',
      'FECHA_EMISION_FUTURA'
    );
  }

  // Validar que no sea demasiado antigua (más de 1 año)
  const unAñoAtras = new Date();
  unAñoAtras.setFullYear(unAñoAtras.getFullYear() - 1);
  
  if (fechaEmision < unAñoAtras) {
    throw new ValidationError(
      'La fecha de emisión no puede ser mayor a 1 año en el pasado',
      'FECHA_EMISION_MUY_ANTIGUA'
    );
  }
}

/**
 * Valida que los montos sean positivos
 */
export function validarMontosPositivos(monto: number, campo: string): void {
  if (monto < 0) {
    throw new ValidationError(
      `${campo} no puede ser negativo`,
      'MONTO_NEGATIVO'
    );
  }

  if (monto === 0) {
    throw new ValidationError(
      `${campo} debe ser mayor a cero`,
      'MONTO_CERO'
    );
  }
}
