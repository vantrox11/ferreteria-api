/**
 * Utilidades para cálculos fiscales (IGV)
 * 
 * ACTUALIZADO: Usa Decimal.js para precisión exacta en cálculos monetarios
 */

import Decimal from 'decimal.js';

// Configurar Decimal.js para alta precisión
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface FiscalConfig {
  tasa_impuesto: number;
  exonerado_regional: boolean;
}

export type AfectacionIGV = 'GRAVADO' | 'EXONERADO' | 'INAFECTO';

/**
 * Calcula el IGV aplicable a un producto según jerarquía:
 * 1. Si el tenant está exonerado regionalmente → IGV = 0%
 * 2. Si el producto es EXONERADO o INAFECTO → IGV = 0%
 * 3. Caso contrario → Aplicar tasa del tenant
 * 
 * @param tenantConfig - Configuración tributaria del tenant
 * @param productoAfectacion - Afectación del producto
 * @returns Tasa de IGV a aplicar (en porcentaje, ej: 18.00)
 */
export const calcularTasaIGV = (
  tenantConfig: FiscalConfig,
  productoAfectacion: AfectacionIGV
): number => {
  // Regla 1: Tenant exonerado regionalmente (ej: Amazonía)
  if (tenantConfig.exonerado_regional) {
    return 0;
  }

  // Regla 2: Producto exonerado o inafecto
  if (productoAfectacion === 'EXONERADO' || productoAfectacion === 'INAFECTO') {
    return 0;
  }

  // Regla 3: Aplicar tasa del tenant
  return tenantConfig.tasa_impuesto;
};

/**
 * Descompone un precio final (con IGV) en sus componentes fiscales
 * Usa Decimal.js para precisión exacta
 * 
 * @param precioFinal - Precio con IGV incluido
 * @param tasaIGV - Tasa de IGV en porcentaje (ej: 18.00)
 * @returns Objeto con valor_base, igv y precio_final
 */
export const descomponerPrecioConIGV = (
  precioFinal: number,
  tasaIGV: number
): {
  valor_base: number;
  igv: number;
  precio_final: number;
} => {
  if (tasaIGV === 0) {
    return {
      valor_base: precioFinal,
      igv: 0,
      precio_final: precioFinal,
    };
  }

  const precio = new Decimal(precioFinal);
  const tasa = new Decimal(tasaIGV);
  const divisor = new Decimal(1).plus(tasa.dividedBy(100));

  const valor_base = precio.dividedBy(divisor);
  const igv = precio.minus(valor_base);

  return {
    valor_base: valor_base.toDecimalPlaces(4).toNumber(),
    igv: igv.toDecimalPlaces(4).toNumber(),
    precio_final: precio.toDecimalPlaces(2).toNumber(),
  };
};

/**
 * Calcula el precio final a partir de un valor base (sin IGV)
 * Usa Decimal.js para precisión exacta
 * 
 * @param valorBase - Precio sin IGV
 * @param tasaIGV - Tasa de IGV en porcentaje (ej: 18.00)
 * @returns Precio final con IGV
 */
export const calcularPrecioConIGV = (
  valorBase: number,
  tasaIGV: number
): number => {
  if (tasaIGV === 0) {
    return valorBase;
  }

  const base = new Decimal(valorBase);
  const tasa = new Decimal(tasaIGV);
  const multiplicador = new Decimal(1).plus(tasa.dividedBy(100));

  return base.times(multiplicador).toDecimalPlaces(2).toNumber();
};
