/**
 * Test de Auditoría: Verificar que todas las consultas incluyan tenant_id
 * 
 * Este test escanea los archivos de modelos para detectar consultas Prisma
 * que podrían no incluir el filtro tenant_id, lo cual representa un riesgo
 * de exposición de datos entre tenants (Data Leak).
 * 
 * Ejecutar: npm test -- --testPathPattern=audit-tenant
 */

import * as fs from 'fs';
import * as path from 'path';

// Modelos que NO requieren tenant_id (tablas globales)
const MODELOS_SIN_TENANT = ['tenants', 'planSuscripcion'];

// Operaciones Prisma que requieren where con tenant_id
const OPERACIONES_PELIGROSAS = [
    'findMany',
    'findFirst',
    'findUnique',
    'update',
    'updateMany',
    'delete',
    'deleteMany',
    'count',
    'aggregate',
];

// Patrones que indican consulta sin tenant_id
const PATRON_CONSULTA = /db\.(\w+)\.(findMany|findFirst|findUnique|update|updateMany|delete|deleteMany|count|aggregate)\s*\(\s*\{/g;
const PATRON_WHERE_TENANT = /where:\s*\{[^}]*tenant_id/;

interface Violacion {
    archivo: string;
    linea: number;
    modelo: string;
    operacion: string;
    codigo: string;
}

describe('Auditoría de Seguridad Multi-Tenant', () => {
    const modelsDir = path.join(__dirname, '../../src/models');
    let violaciones: Violacion[] = [];

    beforeAll(() => {
        violaciones = escanearModelos(modelsDir);
    });

    it('Todas las consultas deben incluir filtro tenant_id', () => {
        if (violaciones.length > 0) {
            const mensajes = violaciones.map(
                (v) => `\n  ❌ ${v.archivo}:${v.linea}\n     db.${v.modelo}.${v.operacion}\n     ${v.codigo.substring(0, 100)}...`
            );

            fail(
                `Se encontraron ${violaciones.length} consultas sin tenant_id:\n${mensajes.join('\n')}\n\n` +
                'SOLUCIÓN: Añadir "tenant_id: tenantId" en la cláusula where de cada consulta.'
            );
        }

        expect(violaciones.length).toBe(0);
    });

    it('Debe existir al menos un archivo de modelo para auditar', () => {
        const archivos = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.model.ts'));
        expect(archivos.length).toBeGreaterThan(0);
    });
});

/**
 * Escanea todos los archivos .model.ts buscando consultas sin tenant_id
 */
function escanearModelos(dir: string): Violacion[] {
    const violaciones: Violacion[] = [];
    const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.model.ts'));

    for (const archivo of archivos) {
        const rutaCompleta = path.join(dir, archivo);
        const contenido = fs.readFileSync(rutaCompleta, 'utf-8');
        const lineas = contenido.split('\n');

        lineas.forEach((linea, index) => {
            const numeroLinea = index + 1;

            // Buscar operaciones Prisma en esta línea
            let match;
            const patronLocal = new RegExp(PATRON_CONSULTA.source, 'g');

            while ((match = patronLocal.exec(linea)) !== null) {
                const modelo = match[1];
                const operacion = match[2];

                // Ignorar modelos que no requieren tenant_id
                if (MODELOS_SIN_TENANT.includes(modelo)) {
                    continue;
                }

                // Buscar en las siguientes 10 líneas si hay tenant_id en where
                const bloqueConsulta = lineas.slice(index, Math.min(index + 15, lineas.length)).join('\n');

                // Verificar si tiene where con tenant_id
                if (!PATRON_WHERE_TENANT.test(bloqueConsulta)) {
                    // Excepciones conocidas: consultas por ID único que ya validaron tenant
                    const esExcepcion =
                        bloqueConsulta.includes('where: { id }') ||
                        bloqueConsulta.includes('where: { id: ') ||
                        bloqueConsulta.includes('where: { subdominio') ||
                        bloqueConsulta.includes('// EXCEPCION_TENANT');

                    if (!esExcepcion) {
                        violaciones.push({
                            archivo,
                            linea: numeroLinea,
                            modelo,
                            operacion,
                            codigo: linea.trim(),
                        });
                    }
                }
            }
        });
    }

    return violaciones;
}
