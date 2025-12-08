/**
 * SERVICIO DE CÁLCULO DE IGV - FASE 2.2
 * 
 * Realiza cálculos de desglose de IGV para compras
 * según la normativa peruana (18% de IGV)
 * 
 * ACTUALIZADO: Usa Decimal.js para precisión exacta en cálculos monetarios
 */

import Decimal from 'decimal.js';

// Configurar Decimal.js para alta precisión
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface DesgloseIGV {
  costo_base: number;      // Costo sin IGV
  igv: number;             // Monto del IGV
  total: number;           // Costo con IGV (original)
}

export interface TotalesOrden {
  subtotal_base: number;   // Suma de costos base
  impuesto_igv: number;    // Suma de IGV
  total: number;           // Total con IGV
}

export interface DetalleCompra {
  cantidad: number;
  costo_unitario: number;  // Costo CON IGV
}

export class IGVCalculator {
  // Tasa de IGV en Perú (18%)
  static readonly TASA_IGV = new Decimal(18);
  static readonly FACTOR_IGV = new Decimal('1.18');

  /**
   * Calcula el desglose de un costo que incluye IGV
   * 
   * @param costoConIGV - Costo unitario CON IGV incluido
   * @returns Objeto con costo base, IGV y total
   * 
   * @example
   * calcularDesgloseCompra(118)
   * // Returns: { costo_base: 100, igv: 18, total: 118 }
   */
  static calcularDesgloseCompra(costoConIGV: number): DesgloseIGV {
    const total = new Decimal(costoConIGV);

    // Fórmula: Base = Total / 1.18
    const base = total.dividedBy(this.FACTOR_IGV);

    // Fórmula: IGV = Base * 0.18
    const igv = base.times(this.TASA_IGV).dividedBy(100);

    return {
      costo_base: base.toDecimalPlaces(4).toNumber(),   // 4 decimales para precisión
      igv: igv.toDecimalPlaces(2).toNumber(),           // 2 decimales para moneda
      total: total.toDecimalPlaces(2).toNumber()        // 2 decimales para moneda
    };
  }

  /**
   * Calcula los totales de una orden de compra completa
   * 
   * @param detalles - Array de detalles de compra
   * @returns Objeto con subtotal base, IGV total y total general
   * 
   * @example
   * calcularTotalesOrden([
   *   { cantidad: 10, costo_unitario: 118 },
   *   { cantidad: 5, costo_unitario: 59 }
   * ])
   * // Returns: { subtotal_base: 1250, impuesto_igv: 225, total: 1475 }
   */
  static calcularTotalesOrden(detalles: DetalleCompra[]): TotalesOrden {
    let subtotal_base = new Decimal(0);
    let impuesto_igv = new Decimal(0);
    let total = new Decimal(0);

    detalles.forEach(detalle => {
      const cantidad = new Decimal(detalle.cantidad);
      const costoUnitario = new Decimal(detalle.costo_unitario);

      const desglose = this.calcularDesgloseCompra(detalle.costo_unitario);

      // Acumular base e IGV multiplicados por cantidad
      subtotal_base = subtotal_base.plus(new Decimal(desglose.costo_base).times(cantidad));
      impuesto_igv = impuesto_igv.plus(new Decimal(desglose.igv).times(cantidad));

      // Total = suma EXACTA de los precios ingresados
      total = total.plus(costoUnitario.times(cantidad));
    });

    // Redondear valores finales
    const subtotalRedondeado = subtotal_base.toDecimalPlaces(2);
    let igvRedondeado = impuesto_igv.toDecimalPlaces(2);
    const totalRedondeado = total.toDecimalPlaces(2);

    // Ajuste de redondeo: Si hay diferencia, ajustar IGV
    const diferencia = totalRedondeado.minus(subtotalRedondeado.plus(igvRedondeado));
    if (diferencia.abs().greaterThan(0) && diferencia.abs().lessThanOrEqualTo(0.05)) {
      igvRedondeado = igvRedondeado.plus(diferencia);
    }

    return {
      subtotal_base: subtotalRedondeado.toNumber(),
      impuesto_igv: igvRedondeado.toNumber(),
      total: totalRedondeado.toNumber()
    };
  }

  /**
   * Calcula el costo CON IGV a partir del costo base
   * (Operación inversa para casos especiales)
   * 
   * @param costoBase - Costo sin IGV
   * @returns Costo con IGV incluido
   * 
   * @example
   * calcularConIGV(100)
   * // Returns: 118
   */
  static calcularConIGV(costoBase: number): number {
    return new Decimal(costoBase).times(this.FACTOR_IGV).toDecimalPlaces(2).toNumber();
  }

  /**
   * Valida que un desglose de IGV sea correcto
   * 
   * @param costoBase - Costo sin IGV
   * @param igv - Monto de IGV
   * @param total - Total con IGV
   * @returns true si el desglose es correcto
   */
  static validarDesglose(costoBase: number, igv: number, total: number): boolean {
    const margenError = new Decimal('0.02'); // 2 centavos de margen por redondeo

    const base = new Decimal(costoBase);
    const igvInput = new Decimal(igv);
    const totalInput = new Decimal(total);

    const igvCalculado = base.times(this.TASA_IGV).dividedBy(100);
    const totalCalculado = base.plus(igvInput);

    const errorIGV = igvInput.minus(igvCalculado).abs();
    const errorTotal = totalInput.minus(totalCalculado).abs();

    return errorIGV.lessThanOrEqualTo(margenError) && errorTotal.lessThanOrEqualTo(margenError);
  }
}
