/**
 * TESTS DE INTEGRACIÓN - Órdenes de Compra con IGV
 * FASE 2.3 y 2.4
 * 
 * Estos tests verifican el flujo completo de creación y recepción de órdenes
 * con cálculos de IGV y validaciones fiscales.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../../src/config/db';
import { createOrdenCompra, recibirOrdenCompra } from '../../src/models/orden-compra.model';
import { IGVCalculator } from '../../src/services/igv-calculator.service';

describe('Integración - Órdenes de Compra con IGV', () => {
  let tenantId: number;
  let usuarioId: number;
  let proveedorConRuc: number;
  let proveedorConDni: number;
  let productoId: number;

  beforeAll(async () => {
    // Crear tenant de prueba
    const tenant = await db.tenants.create({
      data: {
        nombre_empresa: 'Test Tenant IGV',
        subdominio: `test-igv-${Date.now()}`,
        isActive: true,
      },
    });
    tenantId = tenant.id;

    // Crear usuario de prueba
    const usuario = await db.usuarios.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Usuario Test',
        email: `test-igv-${Date.now()}@test.com`,
        password_hash: 'hash',
        rol: 'admin',
      },
    });
    usuarioId = usuario.id;

    // Crear proveedor con RUC
    const provRuc = await db.proveedores.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Distribuidora SAC',
        ruc_identidad: '20123456789',
        tipo_documento: 'RUC',
        email: 'distribuidora@test.com',
      },
    });
    proveedorConRuc = provRuc.id;

    // Crear proveedor con DNI
    const provDni = await db.proveedores.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Juan Pérez',
        ruc_identidad: '12345678',
        tipo_documento: 'DNI',
        email: 'juan@test.com',
      },
    });
    proveedorConDni = provDni.id;

    // Crear producto de prueba
    const producto = await db.productos.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Cemento Portland',
        sku: 'CEM-001',
        precio_base: 21.19, // Precio sin IGV
        afectacion_igv: 'GRAVADO',
        stock: 0,
        unidad_medida_id: 1, // Asumiendo que existe una unidad base
      },
    });
    productoId = producto.id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await db.ordenCompraDetalles.deleteMany({ where: { tenant_id: tenantId } });
    await db.ordenesCompra.deleteMany({ where: { tenant_id: tenantId } });
    await db.productos.deleteMany({ where: { tenant_id: tenantId } });
    await db.proveedores.deleteMany({ where: { tenant_id: tenantId } });
    await db.usuarios.deleteMany({ where: { tenant_id: tenantId } });
    await db.tenants.delete({ where: { id: tenantId } });
  });

  describe('Crear Orden con IGV', () => {
    it('debe crear orden con desglose IGV correcto', async () => {
      const data = {
        proveedor_id: proveedorConRuc,
        detalles: [
          { producto_id: productoId, cantidad: 50, costo_unitario: 23.60 }, // 50 bolsas a S/23.60 c/u
        ],
      };

      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      // Verificar totales (Prisma retorna Decimal como string)
      expect(Number(orden.subtotal_base)).toBeCloseTo(1000, 2); // 50 * 20 = 1000 base
      expect(Number(orden.impuesto_igv)).toBeCloseTo(180, 2);    // 18% de 1000 = 180
      expect(Number(orden.total)).toBeCloseTo(1180, 2);          // 1000 + 180 = 1180

      // Verificar snapshot de RUC
      expect(orden.proveedor_ruc).toBe('20123456789');

      // Verificar detalles con desglose IGV
      const detalles = await db.ordenCompraDetalles.findMany({
        where: { orden_compra_id: orden.id },
      });

      expect(detalles).toHaveLength(1);
      expect(Number(detalles[0].costo_unitario_base)).toBeCloseTo(20, 4);
      expect(Number(detalles[0].costo_unitario_total)).toBeCloseTo(23.60, 2);
      expect(Number(detalles[0].tasa_igv)).toBe(18.00);
      expect(Number(detalles[0].igv_linea)).toBeCloseTo(180, 2); // 50 * 3.60 = 180
    });

    it('debe crear orden con múltiples productos', async () => {
      const data = {
        proveedor_id: proveedorConRuc,
        detalles: [
          { producto_id: productoId, cantidad: 50, costo_unitario: 23.60 },  // Base: 1000
          { producto_id: productoId, cantidad: 100, costo_unitario: 2.36 },  // Base: 200
        ],
      };

      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      expect(Number(orden.subtotal_base)).toBeCloseTo(1200, 2);
      expect(Number(orden.impuesto_igv)).toBeCloseTo(216, 2);
      expect(Number(orden.total)).toBeCloseTo(1416, 2);
    });

    it('debe crear orden con datos fiscales opcionales', async () => {
      const data = {
        proveedor_id: proveedorConRuc,
        tipo_comprobante: 'FACTURA' as const,
        serie: 'F005',
        numero: '000123',
        fecha_emision: new Date().toISOString(),
        detalles: [
          { producto_id: productoId, cantidad: 10, costo_unitario: 118 },
        ],
      };

      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      expect(orden.tipo_comprobante).toBe('FACTURA');
      expect(orden.serie).toBe('F005');
      expect(orden.numero).toBe('000123');
      expect(orden.fecha_emision).toBeDefined();
      expect(Number(orden.subtotal_base)).toBeCloseTo(1000, 2);
      expect(Number(orden.impuesto_igv)).toBeCloseTo(180, 2);
    });
  });

  describe('Validaciones Fiscales', () => {
    it('debe rechazar FACTURA si proveedor no tiene RUC', async () => {
      const data = {
        proveedor_id: proveedorConDni, // Proveedor con DNI
        tipo_comprobante: 'FACTURA' as const,
        detalles: [
          { producto_id: productoId, cantidad: 10, costo_unitario: 118 },
        ],
      };

      await expect(
        createOrdenCompra(data, tenantId, usuarioId)
      ).rejects.toThrow(/debe tener RUC para emitir facturas/);
    });

    it('debe aceptar FACTURA si proveedor tiene RUC', async () => {
      const data = {
        proveedor_id: proveedorConRuc, // Proveedor con RUC
        tipo_comprobante: 'FACTURA' as const,
        detalles: [
          { producto_id: productoId, cantidad: 10, costo_unitario: 118 },
        ],
      };

      const orden = await createOrdenCompra(data, tenantId, usuarioId);
      expect(orden.tipo_comprobante).toBe('FACTURA');
    });

    it('debe permitir BOLETA con proveedor DNI', async () => {
      const data = {
        proveedor_id: proveedorConDni,
        tipo_comprobante: 'BOLETA' as const,
        detalles: [
          { producto_id: productoId, cantidad: 10, costo_unitario: 118 },
        ],
      };

      const orden = await createOrdenCompra(data, tenantId, usuarioId);
      expect(orden.tipo_comprobante).toBe('BOLETA');
    });
  });

  describe('Recibir Orden con Validaciones', () => {
    it('debe recibir orden con serie y número', async () => {
      // Crear orden
      const data = {
        proveedor_id: proveedorConRuc,
        detalles: [
          { producto_id: productoId, cantidad: 10, costo_unitario: 118 },
        ],
      };
      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      // Verificar stock inicial
      const productoAntes = await db.productos.findUnique({
        where: { id: productoId },
        select: { stock: true },
      });
      const stockInicial = Number(productoAntes!.stock);

      // Recibir orden
      const datosRecepcion = {
        serie: 'F010',
        numero: '000456',
      };
      const ordenRecibida = await recibirOrdenCompra(tenantId, orden.id, datosRecepcion);

      expect(ordenRecibida.estado).toBe('recibida');
      expect(ordenRecibida.serie).toBe('F010');
      expect(ordenRecibida.numero).toBe('000456');
      expect(ordenRecibida.fecha_recepcion).toBeDefined();

      // Verificar incremento de stock
      const productoDespues = await db.productos.findUnique({
        where: { id: productoId },
        select: { stock: true },
      });
      expect(Number(productoDespues!.stock)).toBeCloseTo(stockInicial + 10, 3);
    });

    it('debe rechazar duplicados de comprobante', async () => {
      // Crear y recibir primera orden
      const data1 = {
        proveedor_id: proveedorConRuc,
        detalles: [{ producto_id: productoId, cantidad: 5, costo_unitario: 118 }],
      };
      const orden1 = await createOrdenCompra(data1, tenantId, usuarioId);
      await recibirOrdenCompra(tenantId, orden1.id, {
        serie: 'F020',
        numero: '000111',
      });

      // Intentar recibir segunda orden con mismo comprobante
      const data2 = {
        proveedor_id: proveedorConRuc,
        detalles: [{ producto_id: productoId, cantidad: 5, costo_unitario: 118 }],
      };
      const orden2 = await createOrdenCompra(data2, tenantId, usuarioId);

      await expect(
        recibirOrdenCompra(tenantId, orden2.id, {
          serie: 'F020',
          numero: '000111', // Mismo número
        })
      ).rejects.toThrow(/Ya existe un comprobante/);
    });

    it('debe permitir mismo número si es diferente proveedor', async () => {
      // Orden del proveedor con RUC
      const data1 = {
        proveedor_id: proveedorConRuc,
        detalles: [{ producto_id: productoId, cantidad: 5, costo_unitario: 118 }],
      };
      const orden1 = await createOrdenCompra(data1, tenantId, usuarioId);
      await recibirOrdenCompra(tenantId, orden1.id, {
        serie: 'F030',
        numero: '000222',
      });

      // Orden del proveedor con DNI (diferente proveedor)
      const data2 = {
        proveedor_id: proveedorConDni,
        detalles: [{ producto_id: productoId, cantidad: 5, costo_unitario: 118 }],
      };
      const orden2 = await createOrdenCompra(data2, tenantId, usuarioId);

      // Debe permitir mismo número porque es otro proveedor
      const ordenRecibida = await recibirOrdenCompra(tenantId, orden2.id, {
        serie: 'F030',
        numero: '000222', // Mismo número pero diferente proveedor_ruc
      });

      expect(ordenRecibida.estado).toBe('recibida');
    });

    it('debe validar formato de serie', async () => {
      const data = {
        proveedor_id: proveedorConRuc,
        detalles: [{ producto_id: productoId, cantidad: 5, costo_unitario: 118 }],
      };
      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      // Serie con caracteres inválidos
      await expect(
        recibirOrdenCompra(tenantId, orden.id, {
          serie: 'F@@@',
          numero: '000123',
        })
      ).rejects.toThrow(/caracteres inválidos/);
    });

    it('debe validar formato de número', async () => {
      const data = {
        proveedor_id: proveedorConRuc,
        detalles: [{ producto_id: productoId, cantidad: 5, costo_unitario: 118 }],
      };
      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      // Número vacío
      await expect(
        recibirOrdenCompra(tenantId, orden.id, {
          serie: 'F040',
          numero: '',
        })
      ).rejects.toThrow(/obligatorio/);
    });
  });

  describe('Casos de Uso Reales', () => {
    it('debe procesar compra típica de ferretería', async () => {
      const data = {
        proveedor_id: proveedorConRuc,
        tipo_comprobante: 'FACTURA' as const,
        detalles: [
          { producto_id: productoId, cantidad: 50, costo_unitario: 23.60 },   // Cemento
          { producto_id: productoId, cantidad: 100, costo_unitario: 2.36 },   // Clavos
          { producto_id: productoId, cantidad: 10, costo_unitario: 35.40 },   // Pintura
        ],
      };

      const orden = await createOrdenCompra(data, tenantId, usuarioId);

      // Verificar cálculos (base total = 1500, IGV = 270)
      expect(Number(orden.subtotal_base)).toBeCloseTo(1500, 2);
      expect(Number(orden.impuesto_igv)).toBeCloseTo(270, 2);
      expect(Number(orden.total)).toBeCloseTo(1770, 2);

      // Recibir con comprobante real
      const ordenRecibida = await recibirOrdenCompra(tenantId, orden.id, {
        serie: 'F001',
        numero: '001234',
      });

      expect(ordenRecibida.estado).toBe('recibida');
      expect(ordenRecibida.serie).toBe('F001');
      expect(ordenRecibida.numero).toBe('001234');
    });
  });
});
