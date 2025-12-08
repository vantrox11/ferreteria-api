import { db } from '../config/db';
import { type Usuarios, type Prisma, type RolUsuario } from '@prisma/client';

/**
 * Obtiene todos los usuarios de un tenant específico (solo activos)
 */
export const findAllUsuariosByTenant = async (tenantId: number) => {
  return db.usuarios.findMany({
    where: { 
      tenant_id: tenantId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      isActive: true,
    },
    orderBy: { email: 'asc' },
  });
};

/**
 * Busca un usuario por id validando pertenencia al tenant
 */
export const findUsuarioByIdAndTenant = async (tenantId: number, id: number) => {
  return db.usuarios.findFirst({
    where: { id, tenant_id: tenantId },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      isActive: true,
    },
  });
};

/**
 * Busca un usuario por email dentro de un tenant específico
 */
export const findUsuarioByEmailAndTenant = async (tenantId: number, email: string) => {
  return db.usuarios.findUnique({
    where: {
      tenant_id_email: {
        tenant_id: tenantId,
        email: email,
      },
    },
  });
};

/**
 * Crea un nuevo usuario dentro de una transacción
 */
export const createUsuario = async (
  data: Omit<Usuarios, 'id' | 'tenant_id'>, 
  tenantId: number,
  tx?: Prisma.TransactionClient
) => {
  const prisma = tx ?? db;
  return prisma.usuarios.create({
    data: {
      ...data,
      tenant_id: tenantId
    }
  });
};

/**
 * Actualiza un usuario por id dentro de un tenant
 */
export const updateUsuarioByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: { nombre?: string; email?: string; rol?: RolUsuario; password_hash?: string }
) => {
  const existing = await db.usuarios.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.usuarios.update({
    where: { id },
    data: {
      nombre: data.nombre ?? existing.nombre,
      email: data.email ?? existing.email,
      rol: data.rol ?? existing.rol,
      ...(data.password_hash && { password_hash: data.password_hash }),
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      isActive: true,
    },
  });
};

/**
 * Desactiva un usuario por id dentro de un tenant (borrado lógico)
 */
export const desactivarUsuarioByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.usuarios.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.usuarios.update({ 
    where: { id }, 
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      isActive: true,
    },
  });
};