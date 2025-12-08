/**
 * SERVICIO DE CÁLCULO DE IGV - FASE 2.2
 * 
 * Realiza cálculos de desglose de IGV para compras
 * según la normativa peruana (18% de IGV)
 */

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
  static readonly TASA_IGV = 18.00;
  static readonly FACTOR_IGV = 1.18;

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
    // Fórmula: Base = Total / 1.18
    const base = costoConIGV / this.FACTOR_IGV;
    
    // Fórmula: IGV = Base * 0.18
    const igv = base * (this.TASA_IGV / 100);
    
    return {
      costo_base: Number(base.toFixed(4)),  // 4 decimales para precisión
      igv: Number(igv.toFixed(2)),          // 2 decimales para moneda
      total: Number(costoConIGV.toFixed(2)) // 2 decimales para moneda
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
    let subtotal_base = 0;
    let impuesto_igv = 0;
    let total = 0;

    detalles.forEach(detalle => {
      const desglose = this.calcularDesgloseCompra(detalle.costo_unitario);
      
      // Acumular base e IGV multiplicados por cantidad
      subtotal_base += desglose.costo_base * detalle.cantidad;
      impuesto_igv += desglose.igv * detalle.cantidad;
      
      // Total = suma EXACTA de los precios ingresados (evita error de redondeo)
      total += detalle.costo_unitario * detalle.cantidad;
    });

    // Redondear valores
    subtotal_base = Number(subtotal_base.toFixed(2));
    impuesto_igv = Number(impuesto_igv.toFixed(2));
    total = Number(total.toFixed(2));

    // Ajuste de redondeo: Si hay diferencia, ajustar IGV (Opción A)
    const diferencia = total - (subtotal_base + impuesto_igv);
    if (Math.abs(diferencia) > 0 && Math.abs(diferencia) <= 0.05) {
      impuesto_igv = Number((impuesto_igv + diferencia).toFixed(2));
    }

    return {
      subtotal_base,
      impuesto_igv,
      total
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
    return Number((costoBase * this.FACTOR_IGV).toFixed(2));
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
    const margenError = 0.02; // 2 centavos de margen por redondeo
    
    const igvCalculado = costoBase * (this.TASA_IGV / 100);
    const totalCalculado = costoBase + igv;
    
    const errorIGV = Math.abs(igv - igvCalculado);
    const errorTotal = Math.abs(total - totalCalculado);
    
    return errorIGV <= margenError && errorTotal <= margenError;
  }
}
