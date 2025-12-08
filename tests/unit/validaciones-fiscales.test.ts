/**
 * TESTS UNITARIOS - Validaciones Fiscales
 * FASE 2.1
 */

import { describe, it, expect } from '@jest/globals';
import {
  validarProveedorParaFactura,
  validarFormatoSerie,
  validarFormatoNumero,
  validarTasaIGV,
  validarFechaEmision,
  validarMontosPositivos,
  ValidationError
} from '../../src/utils/validaciones-fiscales';

describe('Validaciones Fiscales', () => {
  describe('validarProveedorParaFactura', () => {
    it('debe aceptar un proveedor con RUC válido', () => {
      const proveedor = {
        id: 1,
        ruc_identidad: '20123456789',
        tipo_documento: 'RUC' as const,
        nombre: 'Empresa SAC'
      };

      expect(() => validarProveedorParaFactura(proveedor)).not.toThrow();
    });

    it('debe rechazar un proveedor con DNI', () => {
      const proveedor = {
        id: 1,
        ruc_identidad: '12345678',
        tipo_documento: 'DNI' as const,
        nombre: 'Juan Pérez'
      };

      expect(() => validarProveedorParaFactura(proveedor))
        .toThrow(ValidationError);
      
      try {
        validarProveedorParaFactura(proveedor);
      } catch (error: any) {
        expect(error.message).toContain('debe tener RUC para emitir facturas');
        expect(error.code).toBe('PROVEEDOR_SIN_RUC_PARA_FACTURA');
      }
    });

    it('debe rechazar un RUC con formato inválido', () => {
      const proveedor = {
        id: 1,
        ruc_identidad: '123456',
        tipo_documento: 'RUC' as const,
        nombre: 'Empresa SAC'
      };

      expect(() => validarProveedorParaFactura(proveedor))
        .toThrow(ValidationError);
    });

    it('debe rechazar un RUC con caracteres no numéricos', () => {
      const proveedor = {
        id: 1,
        ruc_identidad: '2012345678A',
        tipo_documento: 'RUC' as const,
        nombre: 'Empresa SAC'
      };

      expect(() => validarProveedorParaFactura(proveedor))
        .toThrow(ValidationError);
    });
  });

  describe('validarFormatoSerie', () => {
    it('debe aceptar series válidas', () => {
      expect(() => validarFormatoSerie('F001')).not.toThrow();
      expect(() => validarFormatoSerie('B005')).not.toThrow();
      expect(() => validarFormatoSerie('FC01')).not.toThrow();
      expect(() => validarFormatoSerie('T001-2024')).not.toThrow();
    });

    it('debe rechazar serie vacía', () => {
      expect(() => validarFormatoSerie(''))
        .toThrow(ValidationError);
    });

    it('debe rechazar serie demasiado larga', () => {
      expect(() => validarFormatoSerie('F001234567890'))
        .toThrow(ValidationError);
      
      try {
        validarFormatoSerie('F001234567890');
      } catch (error: any) {
        expect(error.message).toContain('Máximo 10 caracteres');
        expect(error.code).toBe('SERIE_DEMASIADO_LARGA');
      }
    });

    it('debe rechazar serie con caracteres especiales inválidos', () => {
      expect(() => validarFormatoSerie('F@001'))
        .toThrow(ValidationError);
      
      expect(() => validarFormatoSerie('F 001'))
        .toThrow(ValidationError);
    });
  });

  describe('validarFormatoNumero', () => {
    it('debe aceptar números válidos', () => {
      expect(() => validarFormatoNumero('00001')).not.toThrow();
      expect(() => validarFormatoNumero('000345')).not.toThrow();
      expect(() => validarFormatoNumero('123456')).not.toThrow();
      expect(() => validarFormatoNumero('2024-001')).not.toThrow();
    });

    it('debe rechazar número vacío', () => {
      expect(() => validarFormatoNumero(''))
        .toThrow(ValidationError);
    });

    it('debe rechazar número demasiado largo', () => {
      expect(() => validarFormatoNumero('123456789012345678901'))
        .toThrow(ValidationError);
      
      try {
        validarFormatoNumero('123456789012345678901');
      } catch (error: any) {
        expect(error.message).toContain('Máximo 20 caracteres');
        expect(error.code).toBe('NUMERO_DEMASIADO_LARGO');
      }
    });
  });

  describe('validarTasaIGV', () => {
    it('debe aceptar 18%', () => {
      expect(() => validarTasaIGV(18)).not.toThrow();
      expect(() => validarTasaIGV(18.00)).not.toThrow();
    });

    it('debe aceptar 0% (productos exonerados)', () => {
      expect(() => validarTasaIGV(0)).not.toThrow();
    });

    it('debe rechazar otras tasas', () => {
      expect(() => validarTasaIGV(10))
        .toThrow(ValidationError);
      
      expect(() => validarTasaIGV(16))
        .toThrow(ValidationError);
      
      expect(() => validarTasaIGV(21))
        .toThrow(ValidationError);
      
      try {
        validarTasaIGV(10);
      } catch (error: any) {
        expect(error.message).toContain('Solo se permite 0% o 18%');
        expect(error.code).toBe('TASA_IGV_INVALIDA');
      }
    });
  });

  describe('validarFechaEmision', () => {
    it('debe aceptar fecha de hoy', () => {
      const hoy = new Date();
      expect(() => validarFechaEmision(hoy)).not.toThrow();
    });

    it('debe aceptar fecha del mes pasado', () => {
      const mesPasado = new Date();
      mesPasado.setMonth(mesPasado.getMonth() - 1);
      expect(() => validarFechaEmision(mesPasado)).not.toThrow();
    });

    it('debe rechazar fecha futura', () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 1);
      
      expect(() => validarFechaEmision(futuro))
        .toThrow(ValidationError);
      
      try {
        validarFechaEmision(futuro);
      } catch (error: any) {
        expect(error.message).toContain('no puede ser futura');
        expect(error.code).toBe('FECHA_EMISION_FUTURA');
      }
    });

    it('debe rechazar fecha mayor a 1 año', () => {
      const masDeUnAno = new Date();
      masDeUnAno.setFullYear(masDeUnAno.getFullYear() - 1);
      masDeUnAno.setDate(masDeUnAno.getDate() - 1);
      
      expect(() => validarFechaEmision(masDeUnAno))
        .toThrow(ValidationError);
      
      try {
        validarFechaEmision(masDeUnAno);
      } catch (error: any) {
        expect(error.message).toContain('no puede ser mayor a 1 año');
        expect(error.code).toBe('FECHA_EMISION_MUY_ANTIGUA');
      }
    });
  });

  describe('validarMontosPositivos', () => {
    it('debe aceptar montos positivos', () => {
      expect(() => validarMontosPositivos(100, 'total')).not.toThrow();
      expect(() => validarMontosPositivos(0.01, 'subtotal')).not.toThrow();
      expect(() => validarMontosPositivos(1000000, 'igv')).not.toThrow();
    });

    it('debe rechazar monto cero', () => {
      expect(() => validarMontosPositivos(0, 'total'))
        .toThrow(ValidationError);
      
      try {
        validarMontosPositivos(0, 'total');
      } catch (error: any) {
        expect(error.message).toContain('total debe ser mayor a cero');
        expect(error.code).toBe('MONTO_CERO');
      }
    });

    it('debe rechazar monto negativo', () => {
      expect(() => validarMontosPositivos(-100, 'subtotal'))
        .toThrow(ValidationError);
      
      try {
        validarMontosPositivos(-100, 'subtotal');
      } catch (error: any) {
        expect(error.message).toContain('subtotal no puede ser negativo');
      }
    });
  });

  describe('Integración - Validación de comprobante completo', () => {
    it('debe validar todos los campos de un comprobante válido', () => {
      const proveedor = {
        id: 1,
        ruc_identidad: '20123456789',
        tipo_documento: 'RUC' as const,
        nombre: 'Distribuidora SAC'
      };
      const serie = 'F005';
      const numero = '000345';
      const fechaEmision = new Date();
      const tasaIGV = 18;
      const total = 1180;

      expect(() => {
        validarProveedorParaFactura(proveedor);
        validarFormatoSerie(serie);
        validarFormatoNumero(numero);
        validarFechaEmision(fechaEmision);
        validarTasaIGV(tasaIGV);
        validarMontosPositivos(total, 'total');
      }).not.toThrow();
    });

    it('debe detectar cualquier campo inválido en un comprobante', () => {
      const proveedor = {
        id: 1,
        ruc_identidad: '12345678',
        tipo_documento: 'DNI' as const,
        nombre: 'Juan Pérez'
      };
      const serie = 'F@@@';
      const numero = '';
      const fechaEmision = new Date();
      fechaEmision.setDate(fechaEmision.getDate() + 10);
      const tasaIGV = 10;
      const total = -100;

      expect(() => validarProveedorParaFactura(proveedor)).toThrow();
      expect(() => validarFormatoSerie(serie)).toThrow();
      expect(() => validarFormatoNumero(numero)).toThrow();
      expect(() => validarFechaEmision(fechaEmision)).toThrow();
      expect(() => validarTasaIGV(tasaIGV)).toThrow();
      expect(() => validarMontosPositivos(total, 'total')).toThrow();
    });
  });
});
