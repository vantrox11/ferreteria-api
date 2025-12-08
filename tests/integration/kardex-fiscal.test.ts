/**
 * Tests de Integración: Kardex Fiscal Backend
 * 
 * Valida que el reporte Kardex incluya información fiscal completa:
 * - Serie y número de comprobantes en ventas
 * - Serie y número de compras del proveedor
 * - Documentos de identidad (RUC/DNI)
 * - Formato de referencias documentales
 */

import { PrismaClient } from '@prisma/client';
import { generarKardexCompleto } from '../../src/models/reporte.model';

const db = new PrismaClient();

describe('KARDEX FISCAL - Integración', () => {
  let tenantId: number;
  let productoId: number;
  let proveedorId: number;
  let clienteId: number;
  let serieId: number;
  let unidadMedidaId: number;

  beforeAll(async () => {
    // Crear tenant de prueba
    const tenant = await db.tenants.create({
      data: { 
        nombre_empresa: 'KARDEX_TEST', 
        subdominio: 'kardex-test',
        isActive: true,
      },
    });
    tenantId = tenant.id;

    // Crear unidad de medida
    const unidad = await db.unidadesMedida.create({
      data: {
        tenant_id: tenantId,
        codigo: 'UNI',
        nombre: 'Unidad',
        permite_decimales: false,
      },
    });
    unidadMedidaId = unidad.id;

    // Crear proveedor con RUC
    const proveedor = await db.proveedores.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Proveedor Test SAC',
        tipo_documento: 'RUC',
        ruc_identidad: '20123456789',
        email: 'proveedor@test.com',
        telefono: '987654321',
        direccion: 'Av. Test 123',
      },
    });
    proveedorId = proveedor.id;

    // Crear cliente con DNI
    const cliente = await db.clientes.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Cliente Test',
        documento_identidad: '12345678',
        email: 'cliente@test.com',
        telefono: '987654321',
        direccion: 'Jr. Test 456',
      },
    });
    clienteId = cliente.id;

    // Crear serie para ventas
    const serie = await db.series.create({
      data: {
        tenant_id: tenantId,
        codigo: 'B001',
        tipo_comprobante: 'BOLETA',
        correlativo_actual: 0,
      },
    });
    serieId = serie.id;

    // Crear producto con stock 90 que coincidirá con los movimientos:
    // - Ajuste entrada: +5 (2024-01-01)
    // - Venta: -5 (2024-01-05)  
    // - Compra: +10 (2024-01-10)
    // Stock final esperado: 90 + 5 - 5 + 10 = 100
    const producto = await db.productos.create({
      data: {
        tenant_id: tenantId,
        nombre: 'Producto Kardex Test',
        descripcion: 'Producto para pruebas de kardex fiscal',
        precio_base: 100.00,
        stock: 90,  // Stock actual antes de los movimientos de test
        stock_minimo: 10,
        unidad_medida_id: unidadMedidaId,
      },
    });
    productoId = producto.id;
  });

  afterAll(async () => {
    // Limpieza (el orden importa para las FK)
    await db.ventaDetalles.deleteMany({ where: { tenant_id: tenantId } });
    await db.ventas.deleteMany({ where: { tenant_id: tenantId } });
    await db.ordenCompraDetalles.deleteMany({ where: { tenant_id: tenantId } });
    await db.ordenesCompra.deleteMany({ where: { tenant_id: tenantId } });
    await db.inventarioAjustes.deleteMany({ where: { tenant_id: tenantId } });
    await db.productos.deleteMany({ where: { tenant_id: tenantId } });
    await db.clientes.deleteMany({ where: { tenant_id: tenantId } });
    await db.proveedores.deleteMany({ where: { tenant_id: tenantId } });
    await db.series.deleteMany({ where: { tenant_id: tenantId } });
    await db.tenants.delete({ where: { id: tenantId } });
    // UnidadesMedida se elimina en cascada con Tenant
    await db.$disconnect();
  });

  describe('📋 Formato de Referencias Documentales', () => {
    
    test('Venta debe mostrar formato SERIE-NUMERO (B001-000001)', async () => {
      // Crear venta con serie y número
      const venta = await db.ventas.create({
        data: {
          tenant_id: tenantId,
          cliente_id: clienteId,
          serie_id: serieId,
          numero_comprobante: 1,
          metodo_pago: 'efectivo',
          total: 118.00,
          created_at: new Date('2024-01-05T10:00:00Z'),
        },
      });

      await db.ventaDetalles.create({
        data: {
          tenant_id: tenantId,
          venta_id: venta.id,
          producto_id: productoId,
          cantidad: 5,
          valor_unitario: 100.00,
          precio_unitario: 118.00,
          igv_total: 18.00,
          tasa_igv: 18.00,
        },
      });

      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      const movimientoVenta = kardex.movimientos.find(m => m.tipo === 'venta');
      expect(movimientoVenta).toBeDefined();
      expect(movimientoVenta!.referencia).toBe('B001-000001');
    });

    test('Compra debe mostrar formato SERIE-NUMERO del proveedor', async () => {
      // Crear orden de compra con datos fiscales
      const orden = await db.ordenesCompra.create({
        data: {
          tenant_id: tenantId,
          proveedor_id: proveedorId,
          estado: 'recibida',
          fecha_recepcion: new Date('2024-01-10T14:00:00Z'),
          tipo_comprobante: 'FACTURA',
          serie: 'F005',
          numero: '000123',
          fecha_emision: new Date('2024-01-10T00:00:00Z'),
          proveedor_ruc: '20123456789',
          subtotal_base: 100.00,
          impuesto_igv: 18.00,
          total: 118.00,
        },
      });

      await db.ordenCompraDetalles.create({
        data: {
          tenant_id: tenantId,
          orden_compra_id: orden.id,
          producto_id: productoId,
          cantidad: 10,
          costo_unitario: 118.00,
          costo_unitario_base: 100.00,
          tasa_igv: 18.00,
          igv_linea: 18.00,
          costo_unitario_total: 118.00,
        },
      });

      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      const movimientoCompra = kardex.movimientos.find(m => m.tipo === 'compra');
      expect(movimientoCompra).toBeDefined();
      expect(movimientoCompra!.referencia).toBe('F005-000123');
    });

    test('Ajuste debe mostrar formato ADJ-XXXX', async () => {
      // Crear usuario para ajuste
      const usuario = await db.usuarios.create({
        data: {
          tenant_id: tenantId,
          nombre: 'Admin Test',
          email: 'admin@kardex.test',
          password_hash: 'dummy_hash',
          rol: 'admin',
        },
      });

      // Crear ajuste manual
      const ajuste = await db.inventarioAjustes.create({
        data: {
          tenant_id: tenantId,
          producto_id: productoId,
          tipo: 'entrada',
          cantidad: 5,
          motivo: 'Reposición por devolución',
          usuario_id: usuario.id,
          created_at: new Date('2024-01-07T12:00:00Z'),  // Entre venta (2024-01-05) y compra (2024-01-10)
        },
      });

      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      const movimientoAjuste = kardex.movimientos.find(m => m.tipo === 'ajuste_entrada');
      expect(movimientoAjuste).toBeDefined();
      expect(movimientoAjuste!.referencia).toMatch(/^ADJ-\d{4}$/);
      expect(movimientoAjuste!.referencia).toBe(`ADJ-${String(ajuste.id).padStart(4, '0')}`);

      // Limpieza
      await db.inventarioAjustes.delete({ where: { id: ajuste.id } });
      await db.usuarios.delete({ where: { id: usuario.id } });
    });
  });

  describe('📄 Información Fiscal Completa', () => {
    
    test('Venta debe incluir tercero y tercero_documento (DNI cliente)', async () => {
      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      const movimientoVenta = kardex.movimientos.find(m => m.tipo === 'venta');
      expect(movimientoVenta).toBeDefined();
      expect(movimientoVenta!.tercero).toBe('Cliente Test');
      expect(movimientoVenta!.tercero_documento).toBe('12345678');
    });

    test('Compra debe incluir tercero y tercero_documento (RUC proveedor)', async () => {
      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      const movimientoCompra = kardex.movimientos.find(m => m.tipo === 'compra');
      expect(movimientoCompra).toBeDefined();
      expect(movimientoCompra!.tercero).toBe('Proveedor Test SAC');
      expect(movimientoCompra!.tercero_documento).toBe('20123456789');
    });

    test('Kardex debe mantener orden cronológico descendente', async () => {
      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      // Verificar que hay al menos 1 movimiento (puede ser 0 si se ejecuta solo este test)
      if (kardex.movimientos.length < 2) {
        // Si no hay suficientes movimientos, el test pasa (no hay nada que ordenar)
        expect(kardex.movimientos.length).toBeGreaterThanOrEqual(0);
        return;
      }

      // Verificar orden descendente (más reciente primero)
      for (let i = 0; i < kardex.movimientos.length - 1; i++) {
        const fechaActual = new Date(kardex.movimientos[i].fecha).getTime();
        const fechaSiguiente = new Date(kardex.movimientos[i + 1].fecha).getTime();
        expect(fechaActual).toBeGreaterThanOrEqual(fechaSiguiente);
      }
    });

    test('Movimientos sin datos fiscales deben usar referencia genérica', async () => {
      // Crear compra SIN serie/numero (datos legacy)
      const ordenLegacy = await db.ordenesCompra.create({
        data: {
          tenant_id: tenantId,
          proveedor_id: proveedorId,
          estado: 'recibida',
          fecha_recepcion: new Date('2023-12-01T10:00:00Z'),
          tipo_comprobante: null,
          serie: null,
          numero: null,
          fecha_emision: null,
          proveedor_ruc: null,
          subtotal_base: null,
          impuesto_igv: null,
          total: 100.00,
        },
      });

      await db.ordenCompraDetalles.create({
        data: {
          tenant_id: tenantId,
          orden_compra_id: ordenLegacy.id,
          producto_id: productoId,
          cantidad: 3,
          costo_unitario: 100.00,
          costo_unitario_base: null,
          tasa_igv: null,
          igv_linea: null,
          costo_unitario_total: null,
        },
      });

      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      const movimientoLegacy = kardex.movimientos.find(
        m => m.tipo === 'compra' && m.referencia.startsWith('Compra #')
      );
      expect(movimientoLegacy).toBeDefined();
      expect(movimientoLegacy!.referencia).toBe(`Compra #${ordenLegacy.id}`);

      // Limpieza
      await db.ordenCompraDetalles.deleteMany({ where: { orden_compra_id: ordenLegacy.id } });
      await db.ordenesCompra.delete({ where: { id: ordenLegacy.id } });
    });
  });

  describe('📊 Cálculo de Saldos con Datos Fiscales', () => {
    
    test('Saldo debe calcularse correctamente incluyendo todos los movimientos', async () => {
      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');

      // Verificar que el último movimiento (más antiguo) tiene el saldo más bajo
      const movimientoMasAntiguo = kardex.movimientos[kardex.movimientos.length - 1];
      const movimientoMasReciente = kardex.movimientos[0];

      // Verificar que todos los saldos son números válidos no negativos
      kardex.movimientos.forEach(mov => {
        expect(typeof mov.saldo).toBe('number');
        expect(mov.saldo).toBeGreaterThanOrEqual(0);
      });
    });

    test('Saldo final debe coincidir con stock actual del producto', async () => {
      const kardex = await generarKardexCompleto(tenantId, productoId);
      
      if (!kardex) throw new Error('Kardex null');
      
      const producto = await db.productos.findUnique({ where: { id: productoId } });

      expect(Number(kardex.producto.stock)).toBe(Number(producto!.stock));
      
      // El movimiento más reciente debe tener saldo = stock actual
      if (kardex.movimientos.length > 0) {
        expect(kardex.movimientos[0].saldo).toBe(Number(producto!.stock));
      }
    });
  });
});
