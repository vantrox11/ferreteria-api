/**
 * Utilidades para cálculos fiscales (IGV)
 */

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

  const divisor = 1 + (tasaIGV / 100);
  const valor_base = precioFinal / divisor;
  const igv = precioFinal - valor_base;

  return {
    valor_base: Number(valor_base.toFixed(2)),
    igv: Number(igv.toFixed(2)),
    precio_final: precioFinal,
  };
};

/**
 * Calcula el precio final a partir de un valor base (sin IGV)
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

  const multiplicador = 1 + (tasaIGV / 100);
  return Number((valorBase * multiplicador).toFixed(2));
};
