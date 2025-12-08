import { db } from '../config/db';
import { type Prisma } from '@prisma/client';
import { type CreateProveedorDTO, type UpdateProveedorDTO } from '../dtos/proveedor.dto';

/**
 * Obtiene todos los proveedores de un tenant específico (solo activos)
 */
export const findAllProveedoresByTenant = async (tenantId: number) => {
  return db.proveedores.findMany({
    where: { 
      tenant_id: tenantId,
      isActive: true,
    },
    orderBy: { nombre: 'asc' },
  });
};

/**
 * Busca un proveedor por id validando pertenencia al tenant
 */
export const findProveedorByIdAndTenant = async (tenantId: number, id: number) => {
  return db.proveedores.findFirst({
    where: { id, tenant_id: tenantId },
  });
};

/**
 * Crea un nuevo proveedor para un tenant específico
 */
export const createProveedor = async (
  data: CreateProveedorDTO,
  tenantId: number,
  tx?: Prisma.TransactionClient
) => {
  const prismaClient = tx || db;
  return prismaClient.proveedores.create({
    data: {
      nombre: data.nombre,
      tipo_documento: data.tipo_documento,
      ruc_identidad: data.ruc_identidad,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      direccion: data.direccion ?? null,
      tenant_id: tenantId,
    },
  });
};

/**
 * Actualiza un proveedor por id dentro de un tenant
 */
export const updateProveedorByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: UpdateProveedorDTO
) => {
  const existing = await db.proveedores.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.proveedores.update({
    where: { id },
    data: {
      nombre: data.nombre ?? existing.nombre,
      tipo_documento: data.tipo_documento ?? existing.tipo_documento,
      ruc_identidad: data.ruc_identidad ?? existing.ruc_identidad,
      email: data.email ?? existing.email,
      telefono: data.telefono ?? existing.telefono,
      direccion: data.direccion ?? existing.direccion,
    },
  });
};

/**
 * Desactiva un proveedor por id dentro de un tenant (borrado lógico)
 */
export const desactivarProveedorByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.proveedores.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.proveedores.update({ 
    where: { id }, 
    data: { isActive: false } 
  });
};