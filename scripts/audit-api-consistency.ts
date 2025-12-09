/**
 * Script de Auditoría Moderno: Consistencia entre Rutas Express y Documentación OpenAPI
 * 
 * Verifica archivo por archivo en src/routes/:
 * 1. Cuenta definiciones de rutas Express (router.get, router.post, etc.)
 * 2. Cuenta registros de OpenAPI (registry.registerPath)
 * 3. Reporta discrepancias específicas por archivo
 */

import * as fs from 'fs';
import * as path from 'path';

interface FileReport {
  file: string;
  expressCount: number;
  openapiCount: number;
  isConsistent: boolean;
  missing: number;
}

class APIConsistencyAuditor {
  private routesPath = path.join(__dirname, '../src/routes');
  private totalExpress = 0;
  private totalOpenAPI = 0;
  private inconsistencies: FileReport[] = [];

  async audit() {
    console.log('🔍 Iniciando auditoría de consistencia API (Express vs OpenAPI Zod)...\n');

    const files = fs.readdirSync(this.routesPath).filter(f => f.endsWith('.routes.ts'));

    console.log(`📂 Escaneando ${files.length} archivos de rutas...\n`);
    console.log('RESULTADOS POR ARCHIVO:');
    console.log('----------------------------------------------------------------');
    console.log(`${'ARCHIVO'.padEnd(35)} | EXPRESS | OPENAPI | ESTADO`);
    console.log('----------------------------------------------------------------');

    for (const file of files) {
      this.analyzeFile(file);
    }

    this.printSummary();

    if (this.inconsistencies.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  private analyzeFile(filename: string) {
    const content = fs.readFileSync(path.join(this.routesPath, filename), 'utf-8');

    // Regex para encontrar definiciones de Express router.get(, router.post(, etc.
    // Excluye comentarios simples //
    const expressMatches = (content.match(/router\.(get|post|put|delete|patch)\s*\(/g) || []).filter(m => !content.includes(`// ${m}`));
    const expressCount = expressMatches.length;

    // Regex para encontrar registros de OpenAPI registry.registerPath(
    const openapiMatches = (content.match(/registry\.registerPath\s*\(/g) || []);
    const openapiCount = openapiMatches.length;

    this.totalExpress += expressCount;
    this.totalOpenAPI += openapiCount;

    const isConsistent = expressCount === openapiCount;
    if (!isConsistent) {
      this.inconsistencies.push({
        file: filename,
        expressCount,
        openapiCount,
        isConsistent,
        missing: expressCount - openapiCount
      });
    }

    const statusIcon = isConsistent ? '✅' : '❌';
    console.log(`${filename.padEnd(35)} | ${expressCount.toString().padEnd(7)} | ${openapiCount.toString().padEnd(7)} | ${statusIcon}`);
  }

  private printSummary() {
    console.log('----------------------------------------------------------------');
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`   🔸 Total Endpoints Express: ${this.totalExpress}`);
    console.log(`   🔸 Total Docs OpenAPI:      ${this.totalOpenAPI}`);
    console.log(`   🔸 Cobertura:               ${((this.totalOpenAPI / this.totalExpress) * 100).toFixed(1)}%`);

    if (this.inconsistencies.length > 0) {
      console.log('\n⚠️  SE ENCONTRARON INCONSISTENCIAS EN LOS SIGUIENTES ARCHIVOS:');
      this.inconsistencies.forEach(inc => {
        console.log(`   ❌ ${inc.file}: Tiene ${inc.expressCount} rutas pero solo ${inc.openapiCount} documentadas (Faltan: ${inc.missing})`);
      });
      console.log('\n💡 ACCIÓN REQUERIDA: Revisa los archivos marcados y agrega registry.registerPath().');
    } else {
      console.log('\n✅ ¡FELICIDADES! Tu API está 100% documentada y sincronizada.');
    }
  }
}

// Ejecutar
new APIConsistencyAuditor().audit().catch(console.error);
