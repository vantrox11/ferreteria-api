/**
 * TESTS UNITARIOS - IGV Calculator Service
 * FASE 2.2
 */

import { describe, it, expect } from '@jest/globals';
import { IGVCalculator } from '../../src/services/igv-calculator.service';

describe('IGVCalculator', () => {
  describe('calcularDesgloseCompra', () => {
    it('debe calcular correctamente el desglose de 118 soles', () => {
      const resultado = IGVCalculator.calcularDesgloseCompra(118);
      
      expect(resultado.costo_base).toBeCloseTo(100, 2);
      expect(resultado.igv).toBeCloseTo(18, 2);
      expect(resultado.total).toBe(118);
    });

    it('debe calcular correctamente el desglose de 59 soles', () => {
      const resultado = IGVCalculator.calcularDesgloseCompra(59);
      
      expect(resultado.costo_base).toBeCloseTo(50, 2);
      expect(resultado.igv).toBeCloseTo(9, 2);
      expect(resultado.total).toBe(59);
    });

    it('debe manejar decimales correctamente', () => {
      const resultado = IGVCalculator.calcularDesgloseCompra(23.60);
      
      expect(resultado.costo_base).toBeCloseTo(20, 2);
      expect(resultado.igv).toBeCloseTo(3.60, 2);
      expect(resultado.total).toBe(23.60);
    });

    it('debe manejar valores pequeños', () => {
      const resultado = IGVCalculator.calcularDesgloseCompra(1.18);
      
      expect(resultado.costo_base).toBeCloseTo(1, 2);
      expect(resultado.igv).toBeCloseTo(0.18, 2);
      expect(resultado.total).toBe(1.18);
    });

    it('debe manejar valores grandes', () => {
      const resultado = IGVCalculator.calcularDesgloseCompra(11800);
      
      expect(resultado.costo_base).toBeCloseTo(10000, 2);
      expect(resultado.igv).toBeCloseTo(1800, 2);
      expect(resultado.total).toBe(11800);
    });
  });

  describe('calcularTotalesOrden', () => {
    it('debe calcular totales de una orden simple', () => {
      const detalles = [
        { cantidad: 10, costo_unitario: 118 }
      ];
      
      const resultado = IGVCalculator.calcularTotalesOrden(detalles);
      
      expect(resultado.subtotal_base).toBeCloseTo(1000, 2);
      expect(resultado.impuesto_igv).toBeCloseTo(180, 2);
      expect(resultado.total).toBeCloseTo(1180, 2);
    });

    it('debe calcular totales de una orden con múltiples productos', () => {
      const detalles = [
        { cantidad: 10, costo_unitario: 118 },   // Base: 1000, IGV: 180
        { cantidad: 5, costo_unitario: 59 }      // Base: 250, IGV: 45
      ];
      
      const resultado = IGVCalculator.calcularTotalesOrden(detalles);
      
      expect(resultado.subtotal_base).toBeCloseTo(1250, 2);
      expect(resultado.impuesto_igv).toBeCloseTo(225, 2);
      expect(resultado.total).toBeCloseTo(1475, 2);
    });

    it('debe calcular totales con cantidades decimales', () => {
      const detalles = [
        { cantidad: 2.5, costo_unitario: 118 }
      ];
      
      const resultado = IGVCalculator.calcularTotalesOrden(detalles);
      
      expect(resultado.subtotal_base).toBeCloseTo(250, 2);
      expect(resultado.impuesto_igv).toBeCloseTo(45, 2);
      expect(resultado.total).toBeCloseTo(295, 2);
    });

    it('debe manejar orden vacía', () => {
      const detalles: any[] = [];
      
      const resultado = IGVCalculator.calcularTotalesOrden(detalles);
      
      expect(resultado.subtotal_base).toBe(0);
      expect(resultado.impuesto_igv).toBe(0);
      expect(resultado.total).toBe(0);
    });
  });

  describe('calcularConIGV', () => {
    it('debe calcular el precio con IGV desde la base', () => {
      const resultado = IGVCalculator.calcularConIGV(100);
      
      expect(resultado).toBe(118);
    });

    it('debe manejar decimales', () => {
      const resultado = IGVCalculator.calcularConIGV(20);
      
      expect(resultado).toBe(23.60);
    });
  });

  describe('validarDesglose', () => {
    it('debe validar un desglose correcto', () => {
      const esValido = IGVCalculator.validarDesglose(100, 18, 118);
      
      expect(esValido).toBe(true);
    });

    it('debe rechazar un desglose incorrecto', () => {
      const esValido = IGVCalculator.validarDesglose(100, 20, 120);
      
      expect(esValido).toBe(false);
    });

    it('debe permitir pequeños errores de redondeo', () => {
      // 33.33 / 1.18 = 28.2457... 
      // IGV = 28.2457 * 0.18 = 5.0842...
      // Total = 28.25 + 5.08 = 33.33
      const esValido = IGVCalculator.validarDesglose(28.25, 5.08, 33.33);
      
      expect(esValido).toBe(true);
    });
  });

  describe('Casos de uso reales', () => {
    it('debe calcular correctamente una compra de cemento', () => {
      // 50 bolsas de cemento a S/ 23.60 cada una (con IGV)
      const detalles = [
        { cantidad: 50, costo_unitario: 23.60 }
      ];
      
      const resultado = IGVCalculator.calcularTotalesOrden(detalles);
      
      expect(resultado.subtotal_base).toBeCloseTo(1000, 2);
      expect(resultado.impuesto_igv).toBeCloseTo(180, 2);
      expect(resultado.total).toBeCloseTo(1180, 2);
    });

    it('debe calcular correctamente una compra mixta', () => {
      // Orden típica de ferretería
      const detalles = [
        { cantidad: 50, costo_unitario: 23.60 },    // Cemento
        { cantidad: 100, costo_unitario: 2.36 },    // Clavos
        { cantidad: 10, costo_unitario: 35.40 }     // Pintura
      ];
      
      const resultado = IGVCalculator.calcularTotalesOrden(detalles);
      
      expect(resultado.subtotal_base).toBeCloseTo(1500, 2);
      expect(resultado.impuesto_igv).toBeCloseTo(270, 2);
      expect(resultado.total).toBeCloseTo(1770, 2);
    });
  });
});
