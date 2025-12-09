import { db, dbBase } from '../config/db';
import { type Prisma } from '@prisma/client';
import { type CreateClienteDTO, type UpdateClienteDTO } from '../dtos/cliente.dto';

/**
 * Obtiene clientes de un tenant con paginación y búsqueda (SERVER-SIDE)
 */
export const findClientesPaginados = async (
  tenantId: number,
  params: { skip: number; take: number; search?: string }
) => {
  const { skip, take, search } = params;

  // Construir condición de búsqueda
  const whereClause: Prisma.ClientesWhereInput = {
    tenant_id: tenantId,
    isActive: true,
    ...(search && {
      OR: [
        { nombre: { contains: search } },
        { documento_identidad: { contains: search } },
        { ruc: { contains: search } },
        { email: { contains: search } },
        { telefono: { contains: search } },
      ],
    }),
  };

  // Ejecutar dos consultas en transacción para obtener total y datos
  const [total, data] = await dbBase.$transaction([
    db.clientes.count({ where: whereClause }),
    db.clientes.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { nombre: 'asc' },
    }),
  ]);

  return { total, data };
};

/**
 * Obtiene todos los clientes de un tenant específico (solo activos)
 * @deprecated Usar findClientesPaginados para listas grandes
 */
export const findAllClientesByTenant = async (tenantId: number) => {
  return db.clientes.findMany({
    where: {
      tenant_id: tenantId,
      isActive: true,
    },
    orderBy: { nombre: 'asc' },
  });
};

/**
 * Busca un cliente por id validando pertenencia al tenant
 */
export const findClienteByIdAndTenant = async (tenantId: number, id: number) => {
  return db.clientes.findFirst({
    where: { id, tenant_id: tenantId },
  });
};

/**
 * Crea un nuevo cliente para un tenant específico
 */
export const createCliente = async (
  data: CreateClienteDTO,
  tenantId: number,
  tx?: any // Prisma.TransactionClient o cliente extendido
) => {
  const prismaClient = tx || db;
  return prismaClient.clientes.create({
    data: {
      nombre: data.nombre,
      documento_identidad: data.documento_identidad ?? null,
      ruc: data.ruc ?? null,
      razon_social: data.razon_social ?? null,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      direccion: data.direccion ?? null,
      dias_credito: data.dias_credito ?? 0,
      limite_credito: data.limite_credito ?? 0,
      tenant_id: tenantId,
    },
  });
};

/**
 * Actualiza un cliente por id dentro de un tenant
 */
export const updateClienteByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: UpdateClienteDTO
) => {
  const existing = await db.clientes.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.clientes.update({
    where: { id },
    data: {
      nombre: data.nombre ?? existing.nombre,
      documento_identidad: data.documento_identidad ?? existing.documento_identidad,
      ruc: data.ruc ?? existing.ruc,
      razon_social: data.razon_social ?? existing.razon_social,
      email: data.email ?? existing.email,
      telefono: data.telefono ?? existing.telefono,
      direccion: data.direccion ?? existing.direccion,
      dias_credito: data.dias_credito ?? existing.dias_credito,
      limite_credito: data.limite_credito ?? existing.limite_credito,
    },
  });
};

/**
 * Desactiva un cliente por id dentro de un tenant (borrado lógico)
 */
export const desactivarClienteByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.clientes.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.clientes.update({
    where: { id },
    data: { isActive: false }
  });
};
