/**
 * Generador de OpenAPI desde Schemas de Zod - Arquitectura Distribuida
 * 
 * Este script importa todas las rutas del proyecto, donde cada archivo
 * de rutas registra sus propios endpoints en el registry de OpenAPI.
 * 
 * Ventajas:
 * - Single source of truth: Las rutas definen su propia documentación
 * - Documentación siempre sincronizada con el código
 * - Sin duplicación: No hay que editar este archivo al agregar endpoints
 * - Detección automática de inconsistencias
 */

import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from '../src/config/openapi-registry';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// IMPORTACIÓN DE RUTAS (Registro Distribuido)
// ============================================================================
// Al importar cada archivo de rutas, se ejecutan automáticamente
// los registry.registerPath() que están dentro de cada uno.

import '../src/routes/auth.routes';
import '../src/routes/public.routes'; // Rutas públicas (catálogo y checkout)
import '../src/routes/productos.routes';
import '../src/routes/categorias.routes';
import '../src/routes/marcas.routes';
import '../src/routes/unidades-medida.routes';
import '../src/routes/clientes.routes';
import '../src/routes/proveedores.routes';
import '../src/routes/inventario.routes';
import '../src/routes/cajas.routes';
import '../src/routes/series.routes';
import '../src/routes/ventas.routes';
import '../src/routes/ordenes-compra.routes';
import '../src/routes/pedidos.routes';
import '../src/routes/sesiones-caja.routes';
import '../src/routes/movimientos-caja.routes';
import '../src/routes/usuarios.routes';
import '../src/routes/tenant.routes';
import '../src/routes/reportes.routes';
import '../src/routes/dashboard.routes';
import '../src/routes/auditoria.routes';
import '../src/routes/cobranzas.routes'; // Fase 1: Gestión Financiera
import '../src/routes/notas-credito.routes'; // Fase 2: Facturación Electrónica
import '../src/routes/guias-remision.routes'; // Fase 2: Facturación Electrónica
import '../src/routes/pagos.routes'; // Fase 1: Sistema de Pagos y Amortizaciones

// ============================================================================
// GENERACIÓN DEL DOCUMENTO OPENAPI
// ============================================================================

/**
 * Generar el documento OpenAPI completo desde las rutas distribuidas
 */
function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      version: '2.0.0',
      title: 'Ferretería API',
      description: `API REST para gestión de ferretería con soporte multi-tenant.
      
**Características:**
- Multi-tenancy por subdominio
- Autenticación JWT
- Gestión completa de inventario
- Control de caja y ventas
- Integración SUNAT
- Auditoría completa

**Autenticación:**
Todos los endpoints (excepto /auth) requieren token JWT en header Authorization: Bearer <token>`,
      contact: {
        name: 'Soporte API',
        email: 'soporte@ferreteria.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'https://api.ferreteria.com',
        description: 'Servidor de producción',
      },
    ],
    tags: [
      { name: 'Productos', description: 'Gestión de productos e inventario' },
      { name: 'Categorías', description: 'Categorías de productos' },
      { name: 'Marcas', description: 'Marcas de productos' },
      { name: 'Unidades de Medida', description: 'Unidades de medida SUNAT (UND, KG, etc)' },
      { name: 'Clientes', description: 'Gestión de clientes' },
      { name: 'Autenticación', description: 'Autenticación y autorización' },
      { name: 'Ventas', description: 'Punto de venta (POS)' },
      { name: 'Proveedores', description: 'Gestión de proveedores' },
      { name: 'Órdenes de Compra', description: 'Compras a proveedores' },
      { name: 'Pedidos', description: 'Pedidos de clientes' },
      { name: 'Cajas', description: 'Gestión de cajas registradoras' },
      { name: 'Sesiones de Caja', description: 'Apertura y cierre de caja' },
      { name: 'Movimientos de Caja', description: 'Ingresos y egresos manuales' },
      { name: 'Series SUNAT', description: 'Numeración de comprobantes' },
      { name: 'Usuarios', description: 'Gestión de usuarios del tenant' },
      { name: 'Auditoría', description: 'Logs de auditoría' },
      { name: 'Reportes', description: 'Reportes y analíticas' },
      { name: 'Dashboard', description: 'Estadísticas y KPIs' },
      { name: 'Tenant', description: 'Configuración del tenant' },
      { name: 'Cobranzas', description: 'Cuentas por cobrar y pagos (Gestión Financiera)' },
      { name: 'NotasCredito', description: 'Notas de Crédito - Facturación Electrónica' },
      { name: 'GuiasRemision', description: 'Guías de Remisión - Facturación Electrónica' },
    ],
  });

  return document;
}

/**
 * Guardar documento generado en archivo JSON
 */
function saveDocument() {
  const document = generateOpenAPIDocument();
  const outputPath = path.join(__dirname, '../openapi-generated.json');
  
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
  
  // Contar paths únicos
  const pathsCount = Object.keys(document.paths || {}).length;
  
  // Contar operaciones HTTP (GET, POST, PUT, DELETE, PATCH)
  let operationsCount = 0;
  for (const path of Object.values(document.paths || {})) {
    operationsCount += Object.keys(path as any).filter(
      method => ['get', 'post', 'put', 'delete', 'patch'].includes(method)
    ).length;
  }
  
  const schemasCount = Object.keys(document.components?.schemas || {}).length;
  
  console.log('✅ Documento OpenAPI generado exitosamente desde arquitectura distribuida');
  console.log(`📄 Ubicación: ${outputPath}`);
  console.log(`\n📊 Estadísticas:`);
  console.log(`   - Paths únicos: ${pathsCount}`);
  console.log(`   - Operaciones HTTP (endpoints): ${operationsCount}`);
  console.log(`   - Schemas registrados: ${schemasCount}`);
  console.log(`   - Tags: ${document.tags?.length || 0}`);
  console.log(`\n💡 Arquitectura:`);
  console.log('   - ✅ Documentación distribuida en archivos de rutas');
  console.log('   - ✅ Single source of truth (un solo lugar para definir cada endpoint)');
  console.log('   - ✅ Sincronización automática código ↔ documentación');
  console.log('\n🔄 Para agregar nuevos endpoints:');
  console.log('   1. Define el endpoint en el archivo de rutas correspondiente');
  console.log('   2. Importa el archivo de rutas en este script (si es nuevo)');
  console.log('   3. Ejecuta: npm run generate:openapi\n');
}

// Ejecutar cuando se invoca directamente
if (require.main === module) {
  try {
    saveDocument();
  } catch (error) {
    console.error('❌ Error al generar OpenAPI:', error);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

export { generateOpenAPIDocument };
