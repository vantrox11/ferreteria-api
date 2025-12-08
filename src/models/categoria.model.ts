import { db } from '../config/db';
import { type Prisma } from '@prisma/client';
import { type CreateCategoriaDTO, type UpdateCategoriaDTO } from '../dtos/categoria.dto';

/**
 * Obtiene categorías paginadas de un tenant específico (solo activas)
 */
export const findCategoriasPaginadas = async (
  tenantId: number,
  options: { skip: number; take: number }
) => {
  const [total, data] = await Promise.all([
    db.categorias.count({
      where: { tenant_id: tenantId, isActive: true },
    }),
    db.categorias.findMany({
      where: { tenant_id: tenantId, isActive: true },
      orderBy: { nombre: 'asc' },
      skip: options.skip,
      take: options.take,
    }),
  ]);
  return { total, data };
};

/**
 * Obtiene todas las categorías de un tenant específico (solo activas)
 */
export const findAllCategoriasByTenant = async (tenantId: number) => {
  return db.categorias.findMany({
    where: { 
      tenant_id: tenantId,
      isActive: true,
    },
    orderBy: { nombre: 'asc' },
  });
};

/**
 * Busca una categoría por id validando pertenencia al tenant
 */
export const findCategoriaByIdAndTenant = async (tenantId: number, id: number) => {
  return db.categorias.findFirst({
    where: { id, tenant_id: tenantId },
  });
};

/**
 * Crea una nueva categoría para un tenant específico
 */
export const createCategoria = async (
  data: CreateCategoriaDTO,
  tenantId: number,
  tx?: Prisma.TransactionClient
) => {
  const prismaClient = tx || db;
  return prismaClient.categorias.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      tenant_id: tenantId,
    },
  });
};

/**
 * Actualiza una categoría por id dentro de un tenant
 */
export const updateCategoriaByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: UpdateCategoriaDTO
) => {
  const existing = await db.categorias.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.categorias.update({
    where: { id },
    data: {
      nombre: data.nombre ?? existing.nombre,
      descripcion: data.descripcion ?? existing.descripcion,
    },
  });
};

/**
 * Desactiva una categoría por id dentro de un tenant (borrado lógico)
 */
export const desactivarCategoriaByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.categorias.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.categorias.update({ 
    where: { id }, 
    data: { isActive: false } 
  });
};