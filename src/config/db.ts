import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './prisma-tenant.extension';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Cliente base "crudo" (sin filtros) para uso interno, migraciones, o transacciones
const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

// Exportamos 'dbBase' para transacciones y operaciones que requieren PrismaClient puro
// NOTA: Las transacciones ($transaction) deben usar dbBase, no db
export const dbBase = basePrisma;

// Cliente extendido con auto-filtrado de tenant
const extendedDb = basePrisma.$extends(createTenantExtension());

// Tipo del cliente extendido para uso en firmas de funciones
export type ExtendedPrismaClient = typeof extendedDb;

// Exportamos 'db' con la extensión de seguridad activada por defecto
export const db = extendedDb;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

