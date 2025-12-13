/**
 * SEED COMPLETO - Simulación de 3 meses de operación de Ferretería
 * 
 * Genera datos realistas que simulan la operación de una ferretería:
 * - Maestros: Categorías, Marcas, Unidades, Productos
 * - Usuarios: Admin, Vendedores
 * - Clientes: Con y sin crédito
 * - Proveedores
 * - Series SUNAT: Facturas (F001), Boletas (B001), NC (FC01, BC01), Guías (T001)
 * - Cajas con series asignadas
 * - Órdenes de compra recibidas (generan stock inicial)
 * - MovimientosInventario: Entradas por compras, Salidas por ventas
 * - Sesiones de caja: 90 días de operación
 * - MovimientosCaja: Ingresos por ventas, Egresos por NC
 * - Ventas: Facturas y Boletas, Contado y Crédito
 * - Cuentas por cobrar con Pagos
 * - Notas de crédito de varios tipos
 * - Guías de remisión
 */

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { subDays, addDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

// Configuración
const DIAS_SIMULACION = 90; // 3 meses
const HOY = new Date();
const FECHA_INICIO = subDays(HOY, DIAS_SIMULACION);

// Helpers
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number) =>
    Number((Math.random() * (max - min) + min).toFixed(2));
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) =>
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Datos base
const CATEGORIAS = [
    { nombre: 'Herramientas Manuales', descripcion: 'Martillos, destornilladores, llaves' },
    { nombre: 'Herramientas Eléctricas', descripcion: 'Taladros, amoladoras, sierras' },
    { nombre: 'Materiales de Construcción', descripcion: 'Cemento, fierro, ladrillos' },
    { nombre: 'Pinturas y Acabados', descripcion: 'Pinturas, brochas, rodillos' },
    { nombre: 'Plomería', descripcion: 'Tuberías, válvulas, accesorios' },
    { nombre: 'Electricidad', descripcion: 'Cables, interruptores, tomacorrientes' },
    { nombre: 'Cerrajería', descripcion: 'Cerraduras, candados, llaves' },
    { nombre: 'Ferretería General', descripcion: 'Tornillos, clavos, pernos' },
    { nombre: 'Jardín y Exteriores', descripcion: 'Mangueras, herramientas de jardín' },
    { nombre: 'Seguridad Industrial', descripcion: 'EPP, guantes, cascos' },
];

const MARCAS = ['Stanley', 'DeWalt', 'Bosch', 'Makita', 'Black & Decker', 'Truper', '3M', 'Philips', 'Schneider', 'Tigre'];

const UNIDADES = [
    { codigo: 'UND', nombre: 'Unidad', permite_decimales: false },
    { codigo: 'KG', nombre: 'Kilogramo', permite_decimales: true },
    { codigo: 'MT', nombre: 'Metro', permite_decimales: true },
    { codigo: 'LT', nombre: 'Litro', permite_decimales: true },
    { codigo: 'GL', nombre: 'Galón', permite_decimales: false },
    { codigo: 'BLS', nombre: 'Bolsa', permite_decimales: false },
    { codigo: 'PAR', nombre: 'Par', permite_decimales: false },
];

// Productos con precios realistas
const PRODUCTOS = [
    // Herramientas Manuales (cat 0)
    { sku: 'HM-001', nombre: 'Martillo Carpintero 16oz', precio: 45.00, costo: 28.00, cat: 0, marca: 0, unidad: 0 },
    { sku: 'HM-002', nombre: 'Destornillador Phillips #2', precio: 15.00, costo: 8.00, cat: 0, marca: 0, unidad: 0 },
    { sku: 'HM-003', nombre: 'Alicate Universal 8"', precio: 35.00, costo: 20.00, cat: 0, marca: 0, unidad: 0 },
    { sku: 'HM-004', nombre: 'Llave Francesa 10"', precio: 55.00, costo: 32.00, cat: 0, marca: 0, unidad: 0 },
    { sku: 'HM-005', nombre: 'Flexómetro 5m', precio: 18.00, costo: 10.00, cat: 0, marca: 0, unidad: 0 },
    { sku: 'HM-006', nombre: 'Nivel de Burbuja 24"', precio: 42.00, costo: 25.00, cat: 0, marca: 0, unidad: 0 },

    // Herramientas Eléctricas (cat 1)
    { sku: 'HE-001', nombre: 'Taladro Percutor 1/2" 550W', precio: 189.00, costo: 120.00, cat: 1, marca: 1, unidad: 0 },
    { sku: 'HE-002', nombre: 'Amoladora Angular 4.5" 850W', precio: 165.00, costo: 105.00, cat: 1, marca: 2, unidad: 0 },
    { sku: 'HE-003', nombre: 'Sierra Caladora 500W', precio: 145.00, costo: 90.00, cat: 1, marca: 3, unidad: 0 },
    { sku: 'HE-004', nombre: 'Rotomartillo SDS Plus 800W', precio: 450.00, costo: 290.00, cat: 1, marca: 1, unidad: 0 },

    // Materiales (cat 2)
    { sku: 'MC-001', nombre: 'Cemento Sol Tipo I 42.5kg', precio: 32.50, costo: 26.00, cat: 2, marca: 5, unidad: 5 },
    { sku: 'MC-002', nombre: 'Fierro Corrugado 1/2" x 9m', precio: 48.00, costo: 38.00, cat: 2, marca: 5, unidad: 0 },
    { sku: 'MC-003', nombre: 'Fierro Corrugado 3/8" x 9m', precio: 28.00, costo: 22.00, cat: 2, marca: 5, unidad: 0 },
    { sku: 'MC-004', nombre: 'Alambre Negro #16 kg', precio: 8.50, costo: 5.80, cat: 2, marca: 5, unidad: 1 },

    // Pinturas (cat 3)
    { sku: 'PA-001', nombre: 'Pintura Látex Blanco 4L', precio: 78.00, costo: 52.00, cat: 3, marca: 6, unidad: 4 },
    { sku: 'PA-002', nombre: 'Pintura Esmalte Negro 1L', precio: 45.00, costo: 28.00, cat: 3, marca: 6, unidad: 3 },
    { sku: 'PA-003', nombre: 'Thinner Acrílico 1L', precio: 18.00, costo: 11.00, cat: 3, marca: 6, unidad: 3 },
    { sku: 'PA-004', nombre: 'Brocha 4"', precio: 25.00, costo: 14.00, cat: 3, marca: 5, unidad: 0 },
    { sku: 'PA-005', nombre: 'Rodillo 9" + Bandeja', precio: 32.00, costo: 18.00, cat: 3, marca: 5, unidad: 0 },

    // Plomería (cat 4)
    { sku: 'PL-001', nombre: 'Tubo PVC SAP 1/2" x 5m', precio: 12.00, costo: 7.50, cat: 4, marca: 9, unidad: 0 },
    { sku: 'PL-002', nombre: 'Tubo PVC SAP 3/4" x 5m', precio: 15.00, costo: 9.50, cat: 4, marca: 9, unidad: 0 },
    { sku: 'PL-003', nombre: 'Codo PVC 1/2" 90°', precio: 1.50, costo: 0.80, cat: 4, marca: 9, unidad: 0 },
    { sku: 'PL-004', nombre: 'Tee PVC 1/2"', precio: 2.00, costo: 1.10, cat: 4, marca: 9, unidad: 0 },
    { sku: 'PL-005', nombre: 'Válvula Esférica 1/2"', precio: 28.00, costo: 17.00, cat: 4, marca: 9, unidad: 0 },
    { sku: 'PL-006', nombre: 'Cinta Teflón', precio: 2.50, costo: 1.20, cat: 4, marca: 6, unidad: 0 },

    // Electricidad (cat 5)
    { sku: 'EL-001', nombre: 'Cable THW 14 AWG x 100m', precio: 185.00, costo: 120.00, cat: 5, marca: 7, unidad: 0 },
    { sku: 'EL-002', nombre: 'Cable THW 12 AWG x 100m', precio: 285.00, costo: 185.00, cat: 5, marca: 7, unidad: 0 },
    { sku: 'EL-003', nombre: 'Interruptor Simple', precio: 8.50, costo: 4.50, cat: 5, marca: 8, unidad: 0 },
    { sku: 'EL-004', nombre: 'Interruptor Doble', precio: 14.00, costo: 7.50, cat: 5, marca: 8, unidad: 0 },
    { sku: 'EL-005', nombre: 'Tomacorriente Doble', precio: 12.00, costo: 6.50, cat: 5, marca: 8, unidad: 0 },
    { sku: 'EL-006', nombre: 'Foco LED 9W E27', precio: 12.00, costo: 6.80, cat: 5, marca: 7, unidad: 0 },
    { sku: 'EL-007', nombre: 'Cinta Aislante 3M 18m', precio: 8.00, costo: 4.50, cat: 5, marca: 6, unidad: 0 },

    // Cerrajería (cat 6)
    { sku: 'CE-001', nombre: 'Cerradura Pomo Baño', precio: 35.00, costo: 20.00, cat: 6, marca: 5, unidad: 0 },
    { sku: 'CE-002', nombre: 'Candado 40mm', precio: 25.00, costo: 14.00, cat: 6, marca: 5, unidad: 0 },
    { sku: 'CE-003', nombre: 'Bisagra 3" x 3" Par', precio: 8.00, costo: 4.00, cat: 6, marca: 5, unidad: 6 },

    // Ferretería General (cat 7)
    { sku: 'FG-001', nombre: 'Tornillo Autorroscante 8x1" x100', precio: 18.00, costo: 10.00, cat: 7, marca: 5, unidad: 0 },
    { sku: 'FG-002', nombre: 'Tornillo Drywall 6x1.5" x100', precio: 12.00, costo: 6.50, cat: 7, marca: 5, unidad: 0 },
    { sku: 'FG-003', nombre: 'Clavo 2" kg', precio: 9.50, costo: 5.80, cat: 7, marca: 5, unidad: 1 },
    { sku: 'FG-004', nombre: 'Clavo 3" kg', precio: 9.00, costo: 5.50, cat: 7, marca: 5, unidad: 1 },
    { sku: 'FG-005', nombre: 'Silicona Transparente 280ml', precio: 18.00, costo: 10.50, cat: 7, marca: 6, unidad: 0 },

    // Jardín (cat 8)
    { sku: 'JA-001', nombre: 'Manguera 1/2" x 25m', precio: 65.00, costo: 40.00, cat: 8, marca: 5, unidad: 0 },
    { sku: 'JA-002', nombre: 'Pala Punta Cuadrada', precio: 42.00, costo: 25.00, cat: 8, marca: 5, unidad: 0 },
    { sku: 'JA-003', nombre: 'Pico con Mango', precio: 55.00, costo: 33.00, cat: 8, marca: 5, unidad: 0 },

    // Seguridad (cat 9)
    { sku: 'SI-001', nombre: 'Casco de Seguridad', precio: 28.00, costo: 16.00, cat: 9, marca: 6, unidad: 0 },
    { sku: 'SI-002', nombre: 'Guantes de Cuero Par', precio: 22.00, costo: 12.00, cat: 9, marca: 6, unidad: 6 },
    { sku: 'SI-003', nombre: 'Lentes de Seguridad', precio: 15.00, costo: 8.00, cat: 9, marca: 6, unidad: 0 },
    { sku: 'SI-004', nombre: 'Zapatos Seguridad Punta Acero', precio: 95.00, costo: 58.00, cat: 9, marca: 6, unidad: 6 },
];

// Clientes
const CLIENTES_DATA = [
    // Personas naturales (DNI)
    { nombre: 'Carlos Mendoza Ríos', documento: '45678912', ruc: null, credito: false },
    { nombre: 'María López García', documento: '78912345', ruc: null, credito: false },
    { nombre: 'José Ramírez Torres', documento: '12345678', ruc: null, credito: false },
    { nombre: 'Ana Fernández Vega', documento: '98765432', ruc: null, credito: false },
    { nombre: 'Pedro Sánchez Díaz', documento: '65432198', ruc: null, credito: false },
    { nombre: 'Rosa Martínez Luna', documento: '32165498', ruc: null, credito: false },

    // Empresas (RUC + crédito)
    { nombre: 'Constructora ABC', razonSocial: 'CONSTRUCTORA ABC S.A.C.', documento: null, ruc: '20512345678', credito: true, diasCredito: 30, limite: 25000 },
    { nombre: 'Inmobiliaria XYZ', razonSocial: 'INVERSIONES INMOBILIARIAS XYZ E.I.R.L.', documento: null, ruc: '20198765432', credito: true, diasCredito: 15, limite: 15000 },
    { nombre: 'Maestro Juan Pérez', razonSocial: 'SERVICIOS DE CONSTRUCCION PEREZ', documento: null, ruc: '10456789123', credito: true, diasCredito: 7, limite: 5000 },
    { nombre: 'Electricidad Total', razonSocial: 'ELECTRICIDAD TOTAL S.R.L.', documento: null, ruc: '20654321987', credito: true, diasCredito: 30, limite: 20000 },
    { nombre: 'Plomería Express', razonSocial: 'PLOMERIA EXPRESS S.A.C.', documento: null, ruc: '20321654987', credito: true, diasCredito: 15, limite: 10000 },
];

// Proveedores
const PROVEEDORES_DATA = [
    { nombre: 'Distribuidora Ferretera Nacional', ruc: '20100123456', email: 'ventas@disfernac.com', telefono: '01-4567890', direccion: 'Av. Argentina 1234, Lima' },
    { nombre: 'Aceros Arequipa', ruc: '20370146994', email: 'ventas@acerosarequipa.com', telefono: '01-6178000', direccion: 'Av. La Encalada 1257, Lima' },
    { nombre: 'Cementos Pacasmayo', ruc: '20419387658', email: 'comercial@cementospac.com', telefono: '01-3176000', direccion: 'Calle La Colonia 150, Lima' },
    { nombre: 'Sodimac Perú', ruc: '20389230724', email: 'empresas@sodimac.com', telefono: '01-6116161', direccion: 'Av. Angamos Este 1805, Lima' },
    { nombre: 'Pavco - Mexichem', ruc: '20100035121', email: 'ventas@pavco.com.pe', telefono: '01-2111300', direccion: 'Av. Separadora Industrial 241, Lima' },
];

// Tipo para tracking de stock
type ProductoConStock = {
    id: number;
    costo_compra: Prisma.Decimal | null;
    precio_base: Prisma.Decimal;
    stock: number;
};

async function main() {
    console.log('🌱 Iniciando seed completo - Simulación 3 meses...\n');

    // ==========================================
    // 1. TENANT
    // ==========================================
    console.log('📦 Creando Tenant...');
    const tenant = await prisma.tenants.upsert({
        where: { subdominio: 'ferreteria-demo' },
        update: {},
        create: {
            nombre_empresa: 'Ferretería El Constructor S.A.C.',
            subdominio: 'ferreteria-demo',
            isActive: true,
            configuracion: JSON.stringify({
                empresa: {
                    nombre_empresa: 'Ferretería El Constructor S.A.C.',
                    ruc: '20512345601',
                    direccion: 'Av. Túpac Amaru 1234, Lima',
                    telefono: '01-5551234',
                    email: 'ventas@ferreteria-demo.com',
                    razonSocial: 'FERRETERIA EL CONSTRUCTOR S.A.C.',
                },
                facturacion: {
                    impuesto_nombre: 'IGV',
                    tasa_impuesto: 18.00,
                    es_agente_retencion: false,
                    exonerado_regional: false,
                },
                moneda: 'PEN',
            }),
        },
    });
    console.log(`   ✅ Tenant: ${tenant.nombre_empresa}`);

    // ==========================================
    // 2. USUARIOS
    // ==========================================
    console.log('\n👥 Creando Usuarios...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.usuarios.upsert({
        where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@ferreteria-demo.com' } },
        update: {},
        create: {
            email: 'admin@ferreteria-demo.com',
            password_hash: passwordHash,
            nombre: 'Administrador General',
            rol: 'admin',
            tenant_id: tenant.id
        },
    });

    const empleado1 = await prisma.usuarios.upsert({
        where: { tenant_id_email: { tenant_id: tenant.id, email: 'vendedor1@ferreteria-demo.com' } },
        update: {},
        create: { email: 'vendedor1@ferreteria-demo.com', password_hash: passwordHash, nombre: 'Juan Pérez', rol: 'empleado', tenant_id: tenant.id },
    });

    const empleado2 = await prisma.usuarios.upsert({
        where: { tenant_id_email: { tenant_id: tenant.id, email: 'vendedor2@ferreteria-demo.com' } },
        update: {},
        create: { email: 'vendedor2@ferreteria-demo.com', password_hash: passwordHash, nombre: 'María García', rol: 'empleado', tenant_id: tenant.id },
    });

    const empleado3 = await prisma.usuarios.upsert({
        where: { tenant_id_email: { tenant_id: tenant.id, email: 'cajero1@ferreteria-demo.com' } },
        update: {},
        create: { email: 'cajero1@ferreteria-demo.com', password_hash: passwordHash, nombre: 'Carlos Rojas', rol: 'empleado', tenant_id: tenant.id },
    });

    const empleados = [empleado1, empleado2, empleado3];
    console.log(`   ✅ ${empleados.length + 1} usuarios creados`);

    // ==========================================
    // 3. UNIDADES DE MEDIDA
    // ==========================================
    console.log('\n📏 Creando Unidades de Medida...');
    const unidades = await Promise.all(
        UNIDADES.map(u => prisma.unidadesMedida.create({
            data: { ...u, tenant_id: tenant.id },
        }))
    );
    console.log(`   ✅ ${unidades.length} unidades creadas`);

    // ==========================================
    // 4. CATEGORÍAS
    // ==========================================
    console.log('\n📁 Creando Categorías...');
    const categorias = await Promise.all(
        CATEGORIAS.map(c => prisma.categorias.create({
            data: { ...c, tenant_id: tenant.id },
        }))
    );
    console.log(`   ✅ ${categorias.length} categorías creadas`);

    // ==========================================
    // 5. MARCAS
    // ==========================================
    console.log('\n🏷️ Creando Marcas...');
    const marcas = await Promise.all(
        MARCAS.map(nombre => prisma.marcas.create({
            data: { nombre, tenant_id: tenant.id },
        }))
    );
    console.log(`   ✅ ${marcas.length} marcas creadas`);

    // ==========================================
    // 6. PRODUCTOS (sin stock inicial - se crea con compras)
    // ==========================================
    console.log('\n📦 Creando Productos...');
    const productos = await Promise.all(
        PRODUCTOS.map(p => prisma.productos.create({
            data: {
                sku: p.sku,
                nombre: p.nombre,
                precio_base: p.precio,
                costo_compra: p.costo,
                stock: 0, // Stock inicial 0, se llenará con compras
                stock_minimo: randomBetween(5, 20),
                afectacion_igv: 'GRAVADO',
                categoria_id: categorias[p.cat].id,
                marca_id: marcas[p.marca].id,
                unidad_medida_id: unidades[p.unidad].id,
                tenant_id: tenant.id,
            },
        }))
    );
    console.log(`   ✅ ${productos.length} productos creados (stock inicial: 0)`);

    // Mapa para tracking de stock
    const stockMap: Map<number, ProductoConStock> = new Map();
    productos.forEach(p => stockMap.set(p.id, { id: p.id, costo_compra: p.costo_compra, precio_base: p.precio_base, stock: 0 }));

    // ==========================================
    // 7. CLIENTES
    // ==========================================
    console.log('\n👤 Creando Clientes...');
    const clientes = await Promise.all(
        CLIENTES_DATA.map(c => prisma.clientes.create({
            data: {
                nombre: c.nombre,
                razon_social: c.razonSocial,
                documento_identidad: c.documento,
                ruc: c.ruc,
                email: c.ruc ? `contacto@${c.nombre.toLowerCase().replace(/\s+/g, '')}.com` : undefined,
                telefono: `9${randomBetween(10000000, 99999999)}`,
                direccion: c.ruc ? `Av. ${randomElement(['Arequipa', 'Brasil', 'Javier Prado', 'La Marina'])} ${randomBetween(100, 5000)}, Lima` : undefined,
                dias_credito: c.diasCredito ?? 0,
                limite_credito: c.limite ?? 0,
                tenant_id: tenant.id,
            },
        }))
    );
    console.log(`   ✅ ${clientes.length} clientes creados`);

    // ==========================================
    // 8. PROVEEDORES
    // ==========================================
    console.log('\n🏭 Creando Proveedores...');
    const proveedores = await Promise.all(
        PROVEEDORES_DATA.map(p => prisma.proveedores.create({
            data: {
                nombre: p.nombre,
                ruc_identidad: p.ruc,
                email: p.email,
                telefono: p.telefono,
                direccion: p.direccion,
                tenant_id: tenant.id,
            },
        }))
    );
    console.log(`   ✅ ${proveedores.length} proveedores creados`);

    // ==========================================
    // 9. SERIES SUNAT
    // ==========================================
    console.log('\n📄 Creando Series SUNAT...');
    const serieFactura = await prisma.series.create({
        data: { codigo: 'F001', tipo_comprobante: 'FACTURA', correlativo_actual: 0, tenant_id: tenant.id },
    });
    const serieBoleta = await prisma.series.create({
        data: { codigo: 'B001', tipo_comprobante: 'BOLETA', correlativo_actual: 0, tenant_id: tenant.id },
    });
    const serieNCFactura = await prisma.series.create({
        data: { codigo: 'FC01', tipo_comprobante: 'NOTA_CREDITO', correlativo_actual: 0, tenant_id: tenant.id },
    });
    const serieNCBoleta = await prisma.series.create({
        data: { codigo: 'BC01', tipo_comprobante: 'NOTA_CREDITO', correlativo_actual: 0, tenant_id: tenant.id },
    });
    const serieGuia = await prisma.series.create({
        data: { codigo: 'T001', tipo_comprobante: 'GUIA_REMISION', correlativo_actual: 0, tenant_id: tenant.id },
    });
    console.log('   ✅ 5 series creadas');

    // ==========================================
    // 10. CAJAS
    // ==========================================
    console.log('\n💰 Creando Cajas...');
    const caja1 = await prisma.cajas.create({
        data: { nombre: 'Caja Principal', tenant_id: tenant.id },
    });
    const caja2 = await prisma.cajas.create({
        data: { nombre: 'Caja Secundaria', tenant_id: tenant.id },
    });

    // Asignar series a cajas
    await prisma.series.update({ where: { id: serieFactura.id }, data: { caja_id: caja1.id } });
    await prisma.series.update({ where: { id: serieBoleta.id }, data: { caja_id: caja1.id } });
    console.log('   ✅ 2 cajas creadas con series asignadas');

    const cajas = [caja1, caja2];

    // ==========================================
    // 11. ÓRDENES DE COMPRA (Stock inicial)
    // ==========================================
    console.log('\n📥 Creando Órdenes de Compra (Stock inicial)...');

    let totalOrdenesCompra = 0;
    let totalMovimientosInv = 0;

    // Crear 5-8 órdenes de compra iniciales para cada proveedor
    for (const proveedor of proveedores) {
        const numOrdenes = randomBetween(3, 5);

        for (let i = 0; i < numOrdenes; i++) {
            const fechaCompra = randomDate(subDays(FECHA_INICIO, 30), FECHA_INICIO); // Antes de apertura
            const numProductos = randomBetween(5, 15);
            const productosCompra = [...productos].sort(() => Math.random() - 0.5).slice(0, numProductos);

            let subtotalBase = 0;
            let igvTotal = 0;

            const detallesData = productosCompra.map(p => {
                const cantidad = randomBetween(20, 100);
                const costoUnit = Number(p.costo_compra ?? 0);
                const costoBase = Number((costoUnit / 1.18).toFixed(4));
                const igvLinea = Number(((costoUnit - costoBase) * cantidad).toFixed(2));

                subtotalBase += costoBase * cantidad;
                igvTotal += igvLinea;

                return {
                    producto_id: p.id,
                    cantidad: cantidad,
                    costo_unitario: costoUnit,
                    costo_unitario_base: costoBase,
                    costo_unitario_total: costoUnit,
                    igv_linea: igvLinea,
                    tasa_igv: 18.00,
                    tenant_id: tenant.id,
                };
            });

            const ordenCompra = await prisma.ordenesCompra.create({
                data: {
                    serie: 'OC',
                    numero: String(totalOrdenesCompra + 1).padStart(6, '0'),
                    proveedor_ruc: proveedor.ruc_identidad,
                    tipo_comprobante: 'FACTURA',
                    fecha_emision: fechaCompra,
                    fecha_recepcion: addDays(fechaCompra, randomBetween(1, 5)),
                    subtotal_base: Number(subtotalBase.toFixed(2)),
                    impuesto_igv: Number(igvTotal.toFixed(2)),
                    total: Number((subtotalBase + igvTotal).toFixed(2)),
                    estado: 'recibida',
                    proveedor_id: proveedor.id,
                    usuario_id: admin.id,
                    tenant_id: tenant.id,
                    OrdenCompraDetalles: { create: detallesData },
                },
            });

            // Crear movimientos de inventario por cada detalle
            for (const det of detallesData) {
                const prod = stockMap.get(det.producto_id)!;
                const saldoAnterior = prod.stock;
                const saldoNuevo = saldoAnterior + det.cantidad;

                await prisma.movimientosInventario.create({
                    data: {
                        producto_id: det.producto_id,
                        tipo_movimiento: 'ENTRADA_COMPRA',
                        cantidad: det.cantidad,
                        saldo_anterior: saldoAnterior,
                        saldo_nuevo: saldoNuevo,
                        costo_unitario: det.costo_unitario,
                        orden_compra_id: ordenCompra.id,
                        motivo: `Compra ${ordenCompra.serie}-${ordenCompra.numero} - ${proveedor.nombre}`,
                        usuario_id: admin.id,
                        tenant_id: tenant.id,
                        created_at: ordenCompra.fecha_recepcion!,
                    },
                });

                // Actualizar tracking
                prod.stock = saldoNuevo;
                totalMovimientosInv++;
            }

            totalOrdenesCompra++;
        }
    }

    // Actualizar stock real en BD
    for (const [prodId, data] of stockMap) {
        await prisma.productos.update({
            where: { id: prodId },
            data: { stock: data.stock },
        });
    }

    console.log(`   ✅ ${totalOrdenesCompra} órdenes de compra creadas`);
    console.log(`   ✅ ${totalMovimientosInv} movimientos de inventario (entradas)`);

    // ==========================================
    // 12. SESIONES DE CAJA Y VENTAS (90 días)
    // ==========================================
    console.log('\n🏪 Simulando 90 días de operación...');

    let totalSesiones = 0;
    let totalVentas = 0;
    let totalMovCaja = 0;
    let correlativoF = 0;
    let correlativoB = 0;
    let correlativoGuia = 0;

    const ventasParaNC: { id: number; total: Prisma.Decimal; fecha: Date; esFactura: boolean; sesionId: number }[] = [];
    const ventasParaGuia: { id: number; fecha: Date; clienteId: number | null }[] = [];

    for (let dia = DIAS_SIMULACION; dia >= 0; dia--) {
        const fechaDia = subDays(HOY, dia);
        const esDomingo = fechaDia.getDay() === 0;
        if (esDomingo) continue;

        // Sesión de caja
        const caja = randomElement(cajas);
        const cajero = randomElement(empleados);
        const horaApertura = setMinutes(setHours(fechaDia, randomBetween(7, 9)), randomBetween(0, 59));
        const horaCierre = dia === 0 ? undefined : setMinutes(setHours(fechaDia, randomBetween(18, 21)), randomBetween(0, 59));
        const montoInicial = randomBetween(200, 500);

        let totalVentasSesion = 0;
        let totalIngresosSesion = 0;
        let totalEgresosSesion = 0;

        const sesion = await prisma.sesionesCaja.create({
            data: {
                monto_inicial: montoInicial,
                fecha_apertura: horaApertura,
                fecha_cierre: horaCierre,
                estado: horaCierre ? 'CERRADA' : 'ABIERTA',
                caja_id: caja.id,
                usuario_id: cajero.id,
                tenant_id: tenant.id,
            },
        });
        totalSesiones++;

        // Ventas del día (5-15)
        const numVentas = randomBetween(5, 15);

        for (let v = 0; v < numVentas; v++) {
            const horaVenta = setMinutes(setHours(fechaDia, randomBetween(8, 20)), randomBetween(0, 59));

            // Cliente aleatorio (40% tienen cliente)
            const tieneCliente = Math.random() < 0.4;
            const cliente = tieneCliente ? randomElement(clientes) : null;

            // Factura si tiene RUC, sino Boleta
            const esFactura = !!cliente?.ruc;
            const correlativo = esFactura ? ++correlativoF : ++correlativoB;
            const serieId = esFactura ? serieFactura.id : serieBoleta.id;

            // Crédito solo si cliente tiene límite
            const esCredito = cliente && Number(cliente.limite_credito) > 0 && Math.random() < 0.3;

            // Productos (1-5 items)
            const numItems = randomBetween(1, 5);
            const productosVenta = [...productos].sort(() => Math.random() - 0.5).slice(0, numItems);

            let subtotal = 0;
            let igvTotal = 0;
            const detalles = productosVenta.map(p => {
                const prod = stockMap.get(p.id)!;
                const maxCantidad = Math.min(prod.stock, Number(p.precio_base) < 10 ? 20 : 5);
                const cantidad = Math.max(1, randomBetween(1, Math.max(1, maxCantidad)));

                const precioUnitario = Number(p.precio_base);
                const costoUnitario = Number(p.costo_compra ?? 0);
                const valorUnitario = Number((precioUnitario / 1.18).toFixed(4));
                const igvLinea = Number(((precioUnitario - valorUnitario) * cantidad).toFixed(4));
                subtotal += valorUnitario * cantidad;
                igvTotal += igvLinea;

                return {
                    producto_id: p.id,
                    cantidad,
                    precio_unitario: precioUnitario,
                    valor_unitario: valorUnitario,
                    costo_unitario: costoUnitario,
                    igv_total: igvLinea,
                    tasa_igv: 18,
                    tenant_id: tenant.id,
                };
            });

            const total = subtotal + igvTotal;
            const vendedor = randomElement(empleados);

            const venta = await prisma.ventas.create({
                data: {
                    numero_comprobante: correlativo,
                    total: Number(total.toFixed(2)),
                    condicion_pago: esCredito ? 'CREDITO' : 'CONTADO',
                    metodo_pago: esCredito ? null : randomElement(['EFECTIVO', 'EFECTIVO', 'EFECTIVO', 'YAPE', 'TARJETA']),
                    estado_sunat: 'ACEPTADO',
                    cliente_id: cliente?.id,
                    serie_id: serieId,
                    usuario_id: vendedor.id,
                    sesion_caja_id: sesion.id,
                    tenant_id: tenant.id,
                    created_at: horaVenta,
                    VentaDetalles: { create: detalles },
                },
            });

            totalVentas++;
            totalVentasSesion += Number(total.toFixed(2));

            // Movimiento de caja si es contado
            if (!esCredito) {
                await prisma.movimientosCaja.create({
                    data: {
                        tipo: 'INGRESO',
                        monto: Number(total.toFixed(2)),
                        descripcion: `Venta ${esFactura ? 'F' : 'B'}001-${correlativo}`,
                        venta_id: venta.id,
                        sesion_caja_id: sesion.id,
                        tenant_id: tenant.id,
                        fecha: horaVenta,
                    },
                });
                totalMovCaja++;
                totalIngresosSesion += Number(total.toFixed(2));
            }

            // Movimientos de inventario (salida)
            for (const det of detalles) {
                const prod = stockMap.get(det.producto_id)!;
                const saldoAnterior = prod.stock;
                const saldoNuevo = Math.max(0, saldoAnterior - det.cantidad);

                await prisma.movimientosInventario.create({
                    data: {
                        producto_id: det.producto_id,
                        tipo_movimiento: 'SALIDA_VENTA',
                        cantidad: det.cantidad,
                        saldo_anterior: saldoAnterior,
                        saldo_nuevo: saldoNuevo,
                        costo_unitario: det.costo_unitario,
                        venta_id: venta.id,
                        motivo: `Venta ${esFactura ? 'F' : 'B'}001-${correlativo}`,
                        usuario_id: vendedor.id,
                        tenant_id: tenant.id,
                        created_at: horaVenta,
                    },
                });

                prod.stock = saldoNuevo;
                totalMovimientosInv++;
            }

            // Si crédito, crear CxC
            if (esCredito && cliente) {
                const fechaVenc = addDays(horaVenta, cliente.dias_credito);
                const vencida = fechaVenc < HOY;
                const pagada = Math.random() < 0.6;

                const cxc = await prisma.cuentasPorCobrar.create({
                    data: {
                        monto_total: venta.total,
                        monto_pagado: pagada ? venta.total : 0,
                        saldo_pendiente: pagada ? 0 : venta.total,
                        estado: pagada ? 'PAGADA' : (vencida ? 'VENCIDA' : 'VIGENTE'),
                        fecha_emision: horaVenta,
                        fecha_vencimiento: fechaVenc,
                        fecha_ultimo_pago: pagada ? addDays(horaVenta, randomBetween(1, cliente.dias_credito)) : undefined,
                        venta_id: venta.id,
                        cliente_id: cliente.id,
                        tenant_id: tenant.id,
                    },
                });

                // Si está pagada, crear pago
                if (pagada) {
                    await prisma.pagos.create({
                        data: {
                            monto: venta.total,
                            metodo_pago: randomElement(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO']),
                            referencia: `PAG-${randomBetween(1000, 9999)}`,
                            fecha_pago: cxc.fecha_ultimo_pago!,
                            cuenta_id: cxc.id,
                            usuario_id: vendedor.id,
                            tenant_id: tenant.id,
                        },
                    });
                }
            }

            // Guardar algunas ventas para NC (10%)
            if (Math.random() < 0.1 && dia > 5) {
                ventasParaNC.push({ id: venta.id, total: venta.total, fecha: horaVenta, esFactura, sesionId: sesion.id });
            }

            // Guardar ventas con cliente para guías (20% de ventas con cliente a crédito)
            if (cliente && Math.random() < 0.2 && dia > 3) {
                ventasParaGuia.push({ id: venta.id, fecha: horaVenta, clienteId: cliente.id });
            }
        }

        // Actualizar totales de la sesión si está cerrada
        if (horaCierre) {
            const montoFinal = montoInicial + totalIngresosSesion - totalEgresosSesion;
            await prisma.sesionesCaja.update({
                where: { id: sesion.id },
                data: {
                    total_ventas: totalVentasSesion,
                    total_ingresos: totalIngresosSesion,
                    total_egresos: totalEgresosSesion,
                    monto_final: montoFinal,
                    diferencia: 0, // Arqueo perfecto en seed
                },
            });
        }

        // Progreso cada 10 días
        if (dia % 10 === 0 && dia !== 0) {
            console.log(`   📅 Día ${DIAS_SIMULACION - dia + 1}/${DIAS_SIMULACION} procesado...`);
        }
    }

    console.log(`   ✅ ${totalSesiones} sesiones de caja creadas`);
    console.log(`   ✅ ${totalVentas} ventas creadas`);
    console.log(`   ✅ ${totalMovCaja} movimientos de caja creados`);
    console.log(`   ✅ ${totalMovimientosInv} movimientos de inventario totales`);

    // ==========================================
    // 13. NOTAS DE CRÉDITO
    // ==========================================
    console.log('\n📝 Creando Notas de Crédito...');

    let correlativoNC_F = 0;
    let correlativoNC_B = 0;

    const tiposNC: Array<'DEVOLUCION_TOTAL' | 'DEVOLUCION_PARCIAL' | 'ANULACION_DE_LA_OPERACION' | 'DESCUENTO_GLOBAL'> = [
        'DEVOLUCION_TOTAL',
        'DEVOLUCION_PARCIAL',
        'ANULACION_DE_LA_OPERACION',
        'DESCUENTO_GLOBAL',
    ];

    for (const ventaOrig of ventasParaNC) {
        const tipo = randomElement(tiposNC);
        const serieNcId = ventaOrig.esFactura ? serieNCFactura.id : serieNCBoleta.id;
        const correlativo = ventaOrig.esFactura ? ++correlativoNC_F : ++correlativoNC_B;
        const fechaNC = addDays(ventaOrig.fecha, randomBetween(1, 7));

        let monto = Number(ventaOrig.total);
        if (tipo === 'DEVOLUCION_PARCIAL') monto *= randomDecimal(0.2, 0.6);
        if (tipo === 'DESCUENTO_GLOBAL') monto *= randomDecimal(0.05, 0.15);

        const nc = await prisma.notasCredito.create({
            data: {
                serie_id: serieNcId,
                numero: correlativo,
                tipo_nota: tipo,
                motivo_sustento: `${tipo.replace(/_/g, ' ').toLowerCase()} - Solicitud del cliente`,
                monto_total: Number(monto.toFixed(2)),
                estado_sunat: 'ACEPTADO',
                venta_referencia_id: ventaOrig.id,
                usuario_id: randomElement(empleados).id,
                tenant_id: tenant.id,
                fecha_emision: fechaNC,
            },
        });

        // Movimiento de caja (egreso) si fue devolución de efectivo
        if (tipo === 'DEVOLUCION_TOTAL' || tipo === 'DEVOLUCION_PARCIAL') {
            await prisma.movimientosCaja.create({
                data: {
                    tipo: 'EGRESO',
                    monto: Number(monto.toFixed(2)),
                    descripcion: `NC ${ventaOrig.esFactura ? 'FC' : 'BC'}01-${correlativo} - ${tipo.replace(/_/g, ' ')}`,
                    nota_credito_id: nc.id,
                    sesion_caja_id: ventaOrig.sesionId,
                    tenant_id: tenant.id,
                    fecha: fechaNC,
                },
            });
            totalMovCaja++;
        }
    }
    console.log(`   ✅ ${ventasParaNC.length} notas de crédito creadas`);

    // ==========================================
    // 14. GUÍAS DE REMISIÓN
    // ==========================================
    console.log('\n🚚 Creando Guías de Remisión...');

    for (const ventaInfo of ventasParaGuia) {
        correlativoGuia++;
        const fechaGuia = addDays(ventaInfo.fecha, randomBetween(0, 2));

        // Obtener detalles de la venta
        const ventaConDetalles = await prisma.ventas.findUnique({
            where: { id: ventaInfo.id },
            include: { VentaDetalles: true, cliente: true },
        });

        if (!ventaConDetalles) continue;

        await prisma.guiasRemision.create({
            data: {
                serie_id: serieGuia.id,
                numero: correlativoGuia,
                motivo_traslado: 'VENTA',
                descripcion_motivo: `Entrega de mercadería - Venta ${correlativoGuia}`,
                peso_bruto_total: randomDecimal(5, 100),
                numero_bultos: randomBetween(1, 10),
                direccion_partida: 'Av. Túpac Amaru 1234, Lima',
                ubigeo_partida: '150101',
                direccion_llegada: ventaConDetalles.cliente?.direccion ?? 'Av. Principal 123, Lima',
                ubigeo_llegada: '150101',
                modalidad_transporte: 'PRIVADO',
                placa_vehiculo: `ABC-${randomBetween(100, 999)}`,
                licencia_conducir: `A${randomBetween(10000000, 99999999)}`,
                nombre_conductor: randomElement(['Pedro González', 'Luis Ramírez', 'Jorge Castro']),
                estado_sunat: 'ACEPTADO',
                fecha_emision: fechaGuia,
                fecha_inicio_traslado: fechaGuia,
                venta_id: ventaInfo.id,
                usuario_id: randomElement(empleados).id,
                tenant_id: tenant.id,
                detalles: {
                    create: ventaConDetalles.VentaDetalles.map(d => ({
                        producto_id: d.producto_id,
                        cantidad: d.cantidad,
                        tenant_id: tenant.id,
                    })),
                },
            },
        });
    }
    console.log(`   ✅ ${ventasParaGuia.length} guías de remisión creadas`);

    // ==========================================
    // 15. PEDIDOS
    // ==========================================
    console.log('\n📋 Creando Pedidos...');

    const estadosPedido: Array<'pendiente' | 'confirmado' | 'entregado' | 'cancelado'> = ['pendiente', 'confirmado', 'entregado', 'cancelado'];
    const tiposRecojo: Array<'tienda' | 'envio'> = ['tienda', 'envio'];
    let totalPedidos = 0;

    // Crear 30-50 pedidos
    const numPedidos = randomBetween(30, 50);
    for (let i = 0; i < numPedidos; i++) {
        const fechaPedido = randomDate(FECHA_INICIO, HOY);
        const cliente = Math.random() < 0.7 ? randomElement(clientes) : null;
        const estado = randomElement(estadosPedido);
        const tipoRecojo = randomElement(tiposRecojo);
        const usuarioGestion = randomElement(empleados);

        // Productos del pedido (1-5)
        const numItems = randomBetween(1, 5);
        const productosPedido = [...productos].sort(() => Math.random() - 0.5).slice(0, numItems);

        await prisma.pedidos.create({
            data: {
                created_at: fechaPedido,
                estado,
                tipo_recojo: tipoRecojo,
                cliente_id: cliente?.id,
                usuario_gestion_id: usuarioGestion.id,
                tenant_id: tenant.id,
                detalles: {
                    create: productosPedido.map(p => ({
                        producto_id: p.id,
                        cantidad: Number(p.precio_base) < 10 ? randomBetween(1, 20) : randomBetween(1, 5),
                        tenant_id: tenant.id,
                    })),
                },
            },
        });
        totalPedidos++;
    }
    console.log(`   ✅ ${totalPedidos} pedidos creados`);

    // ==========================================
    // 16. ACTUALIZAR CORRELATIVOS
    // ==========================================
    console.log('\n🔢 Actualizando correlativos...');
    await prisma.series.update({ where: { id: serieFactura.id }, data: { correlativo_actual: correlativoF } });
    await prisma.series.update({ where: { id: serieBoleta.id }, data: { correlativo_actual: correlativoB } });
    await prisma.series.update({ where: { id: serieNCFactura.id }, data: { correlativo_actual: correlativoNC_F } });
    await prisma.series.update({ where: { id: serieNCBoleta.id }, data: { correlativo_actual: correlativoNC_B } });
    await prisma.series.update({ where: { id: serieGuia.id }, data: { correlativo_actual: correlativoGuia } });
    console.log('   ✅ Correlativos actualizados');

    // ==========================================
    // 17. ACTUALIZAR STOCK FINAL EN BD
    // ==========================================
    console.log('\n📊 Actualizando stock final...');
    for (const [prodId, data] of stockMap) {
        await prisma.productos.update({
            where: { id: prodId },
            data: { stock: Math.max(0, data.stock) },
        });
    }
    console.log('   ✅ Stock actualizado');

    // ==========================================
    // RESUMEN
    // ==========================================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log(`
📊 RESUMEN:
   - Tenant: ${tenant.nombre_empresa}
   - Usuarios: ${empleados.length + 1}
   - Unidades de Medida: ${unidades.length}
   - Categorías: ${categorias.length}
   - Marcas: ${marcas.length}
   - Productos: ${productos.length}
   - Clientes: ${clientes.length}
   - Proveedores: ${proveedores.length}
   - Órdenes de Compra: ${totalOrdenesCompra}
   - Sesiones de Caja: ${totalSesiones}
   - Ventas: ${totalVentas}
   - Movimientos de Caja: ${totalMovCaja}
   - Movimientos de Inventario: ${totalMovimientosInv}
   - Notas de Crédito: ${ventasParaNC.length}
   - Guías de Remisión: ${ventasParaGuia.length}
   - Pedidos: ${totalPedidos}
   - Período simulado: ${DIAS_SIMULACION} días

🔐 CREDENCIALES:
   - Admin: admin@ferreteria-demo.com / password123
   - Vendedor: vendedor1@ferreteria-demo.com / password123
  `);
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
