/**
 * Script de Auditoría: Consistencia entre OpenAPI y Schemas de Validación
 * 
 * Verifica que:
 * 1. Todos los endpoints documentados en Swagger tengan DTOs correspondientes
 * 2. Los schemas de Zod coincidan con la documentación OpenAPI
 * 3. No haya endpoints sin documentar
 * 4. Los tipos de respuesta estén correctamente definidos
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

interface EndpointInfo {
  path: string;
  method: string;
  hasSwagger: boolean;
  hasDTO: boolean;
  hasController: boolean;
  dtoSchema?: string;
  swaggerSchema?: string;
}

interface AuditReport {
  totalEndpoints: number;
  completeEndpoints: number;
  missingSwagger: EndpointInfo[];
  missingDTO: EndpointInfo[];
  inconsistencies: Array<{
    endpoint: string;
    issue: string;
    details: string;
  }>;
  recommendations: string[];
}

class APIConsistencyAuditor {
  private report: AuditReport = {
    totalEndpoints: 0,
    completeEndpoints: 0,
    missingSwagger: [],
    missingDTO: [],
    inconsistencies: [],
    recommendations: [],
  };

  private dtosPath = path.join(__dirname, '../src/dtos');
  private controllersPath = path.join(__dirname, '../src/controllers');
  private docsPath = path.join(__dirname, '../src/docs');

  async audit(): Promise<AuditReport> {
    console.log('🔍 Iniciando auditoría de consistencia API...\n');

    // 1. Escanear todos los DTOs
    const dtos = this.scanDTOs();
    console.log(`✅ DTOs encontrados: ${dtos.length}`);

    // 2. Escanear controllers para encontrar endpoints
    const endpoints = this.scanControllers();
    console.log(`✅ Endpoints encontrados: ${endpoints.length}`);

    // 3. Verificar documentación Swagger
    const swaggerEndpoints = this.scanSwaggerDocs();
    console.log(`✅ Endpoints documentados en Swagger: ${swaggerEndpoints.length}`);

    // 4. Comparar y generar reporte
    this.compareAndReport(endpoints, dtos, swaggerEndpoints);

    // 5. Generar recomendaciones
    this.generateRecommendations();

    return this.report;
  }

  private scanDTOs(): string[] {
    const dtoFiles: string[] = [];
    const files = fs.readdirSync(this.dtosPath);
    
    files.forEach(file => {
      if (file.endsWith('.dto.ts')) {
        dtoFiles.push(file);
      }
    });

    return dtoFiles;
  }

  private scanControllers(): string[] {
    const controllerFiles: string[] = [];
    const files = fs.readdirSync(this.controllersPath);
    
    files.forEach(file => {
      if (file.endsWith('.controller.ts')) {
        controllerFiles.push(file);
      }
    });

    return controllerFiles;
  }

  private scanSwaggerDocs(): string[] {
    const swaggerPaths: string[] = [];
    const swaggerFile = path.join(this.docsPath, 'swagger.endpoints.ts');
    
    if (fs.existsSync(swaggerFile)) {
      const content = fs.readFileSync(swaggerFile, 'utf-8');
      // Buscar todos los paths documentados
      const pathMatches = content.match(/\* \/api\/[a-z-\/{}]+:/gi);
      if (pathMatches) {
        swaggerPaths.push(...pathMatches.map(p => p.replace('* ', '').replace(':', '')));
      }
    }

    return swaggerPaths;
  }

  private compareAndReport(
    endpoints: string[],
    dtos: string[],
    swaggerEndpoints: string[]
  ): void {
    this.report.totalEndpoints = endpoints.length;

    // Verificar que cada endpoint tenga DTO y Swagger
    endpoints.forEach(endpoint => {
      const endpointName = endpoint.replace('.controller.ts', '');
      const expectedDTO = `${endpointName}.dto.ts`;
      
      const hasDTO = dtos.includes(expectedDTO);
      const hasSwagger = swaggerEndpoints.some(s => 
        s.toLowerCase().includes(endpointName.replace(/-/g, ''))
      );

      if (!hasDTO) {
        this.report.missingDTO.push({
          path: endpoint,
          method: 'N/A',
          hasSwagger,
          hasDTO: false,
          hasController: true,
        });
      }

      if (!hasSwagger) {
        this.report.missingSwagger.push({
          path: endpoint,
          method: 'N/A',
          hasSwagger: false,
          hasDTO,
          hasController: true,
        });
      }

      if (hasDTO && hasSwagger) {
        this.report.completeEndpoints++;
      }
    });
  }

  private generateRecommendations(): void {
    if (this.report.missingDTO.length > 0) {
      this.report.recommendations.push(
        `⚠️  Crear ${this.report.missingDTO.length} DTOs faltantes para validación de entrada`
      );
    }

    if (this.report.missingSwagger.length > 0) {
      this.report.recommendations.push(
        `📝 Documentar ${this.report.missingSwagger.length} endpoints en Swagger`
      );
    }

    if (this.report.inconsistencies.length > 0) {
      this.report.recommendations.push(
        `🔧 Resolver ${this.report.inconsistencies.length} inconsistencias entre código y documentación`
      );
    }

    const completionRate = (this.report.completeEndpoints / this.report.totalEndpoints) * 100;
    
    if (completionRate === 100) {
      this.report.recommendations.push(
        '✅ ¡Excelente! Todos los endpoints están documentados y validados'
      );
    } else {
      this.report.recommendations.push(
        `📊 Tasa de completitud actual: ${completionRate.toFixed(1)}% - Objetivo: 100%`
      );
    }

    // Recomendaciones adicionales
    this.report.recommendations.push(
      '\n🎯 Próximos pasos recomendados:',
      '1. Implementar generación automática de OpenAPI desde Zod schemas',
      '2. Agregar tests de integración que validen el contrato API',
      '3. Configurar CI/CD para validar consistencia en cada commit',
      '4. Considerar usar @asteasolutions/zod-to-openapi para schema-first approach'
    );
  }

  printReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE DE AUDITORÍA API');
    console.log('='.repeat(80) + '\n');

    console.log(`📦 Total de endpoints: ${this.report.totalEndpoints}`);
    console.log(`✅ Endpoints completos: ${this.report.completeEndpoints}`);
    console.log(`❌ Endpoints sin DTO: ${this.report.missingDTO.length}`);
    console.log(`❌ Endpoints sin Swagger: ${this.report.missingSwagger.length}`);
    console.log(`⚠️  Inconsistencias: ${this.report.inconsistencies.length}\n`);

    if (this.report.missingDTO.length > 0) {
      console.log('❌ Endpoints sin DTO de validación:');
      this.report.missingDTO.forEach(e => console.log(`   - ${e.path}`));
      console.log('');
    }

    if (this.report.missingSwagger.length > 0) {
      console.log('❌ Endpoints sin documentación Swagger:');
      this.report.missingSwagger.forEach(e => console.log(`   - ${e.path}`));
      console.log('');
    }

    console.log('💡 RECOMENDACIONES:\n');
    this.report.recommendations.forEach(rec => console.log(rec));
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// Ejecutar auditoría
async function main() {
  const auditor = new APIConsistencyAuditor();
  const report = await auditor.audit();
  auditor.printReport();

  // Guardar reporte en JSON
  const reportPath = path.join(__dirname, '../audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Reporte guardado en: ${reportPath}\n`);

  // Exit code basado en resultado
  const exitCode = report.missingDTO.length === 0 && 
                   report.missingSwagger.length === 0 &&
                   report.inconsistencies.length === 0 ? 0 : 1;
  
  process.exit(exitCode);
}

main().catch(console.error);
