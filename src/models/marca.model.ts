import { db } from '../config/db';
import { type CreateMarcaDTO, type UpdateMarcaDTO } from '../dtos/marca.dto';

/**
 * Obtiene marcas paginadas del tenant (solo activas)
 */
export async function findMarcasPaginadas(
  tenantId: number,
  options: { skip: number; take: number }
) {
  const [total, data] = await Promise.all([
    db.marcas.count({
      where: { tenant_id: tenantId, isActive: true },
    }),
    db.marcas.findMany({
      where: { tenant_id: tenantId, isActive: true },
      orderBy: { nombre: 'asc' },
      skip: options.skip,
      take: options.take,
      select: {
        id: true,
        nombre: true,
        logo_url: true,
        isActive: true,
        tenant_id: true,
      },
    }),
  ]);
  return { total, data };
}

/**
 * Obtiene todas las marcas del tenant (solo activas)
 */
export async function findAllMarcasByTenant(tenantId: number) {
  return await db.marcas.findMany({
    where: {
      tenant_id: tenantId,
      isActive: true,
    },
    orderBy: {
      nombre: 'asc',
    },
    select: {
      id: true,
      nombre: true,
      logo_url: true,
      isActive: true,
    },
  });
}

/**
 * Obtiene una marca por ID y tenant
 */
export async function findMarcaByIdAndTenant(id: number, tenantId: number) {
  return await db.marcas.findFirst({
    where: {
      id,
      tenant_id: tenantId,
      isActive: true,
    },
  });
}

/**
 * Crea una nueva marca para el tenant
 */
export async function createMarca(data: CreateMarcaDTO, tenantId: number) {
  // Verificar si ya existe el nombre
  const existente = await db.marcas.findFirst({
    where: {
      tenant_id: tenantId,
      nombre: data.nombre,
      isActive: true,
    },
  });

  if (existente) {
    throw new Error(`Ya existe una marca con el nombre "${data.nombre}"`);
  }

  return await db.marcas.create({
    data: {
      ...data,
      tenant_id: tenantId,
    },
  });
}

/**
 * Actualiza una marca por ID y tenant
 */
export async function updateMarcaByIdAndTenant(
  id: number,
  tenantId: number,
  data: UpdateMarcaDTO
) {
  // Verificar que existe
  const marca = await findMarcaByIdAndTenant(id, tenantId);
  if (!marca) {
    throw new Error('Marca no encontrada');
  }

  // Si se está actualizando el nombre, verificar que no exista otra con ese nombre
  if (data.nombre && data.nombre !== marca.nombre) {
    const existente = await db.marcas.findFirst({
      where: {
        tenant_id: tenantId,
        nombre: data.nombre,
        isActive: true,
        id: { not: id },
      },
    });

    if (existente) {
      throw new Error(`Ya existe una marca con el nombre "${data.nombre}"`);
    }
  }

  return await db.marcas.update({
    where: { id },
    data,
  });
}

/**
 * Desactiva una marca (borrado lógico)
 */
export async function desactivarMarcaByIdAndTenant(id: number, tenantId: number) {
  // Verificar que existe
  const marca = await findMarcaByIdAndTenant(id, tenantId);
  if (!marca) {
    throw new Error('Marca no encontrada');
  }

  // Verificar cuántos productos la están usando
  const productosUsando = await db.productos.count({
    where: {
      marca_id: id,
      tenant_id: tenantId,
      isActive: true,
    },
  });

  // Desactivar la marca (no bloquear si hay productos, solo advertir)
  const marcaDesactivada = await db.marcas.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

  return {
    marca: marcaDesactivada,
    productosAfectados: productosUsando,
  };
}
