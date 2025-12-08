import { db } from '../config/db';
import { type CreateUnidadMedidaDTO, type UpdateUnidadMedidaDTO } from '../dtos/unidad-medida.dto';

/**
 * Obtiene unidades de medida paginadas del tenant
 */
export async function findUnidadesPaginadas(
  tenantId: number,
  options: { skip: number; take?: number }
) {
  // Si take es undefined, no incluirlo en el objeto de opciones
  const findManyOptions: any = {
    where: { tenant_id: tenantId },
    orderBy: { codigo: 'asc' },
    skip: options.skip,
  };
  if (typeof options.take === 'number') {
    findManyOptions.take = options.take;
  }
  const [total, data] = await Promise.all([
    db.unidadesMedida.count({
      where: { tenant_id: tenantId },
    }),
    db.unidadesMedida.findMany(findManyOptions),
  ]);
  return { total, data };
}

/**
 * Obtiene todas las unidades de medida del tenant (solo activas)
 */
export async function findAllUnidadesByTenant(tenantId: number) {
  return await db.unidadesMedida.findMany({
    where: {
      tenant_id: tenantId,
    },
    orderBy: {
      codigo: 'asc',
    },
  });
}

/**
 * Obtiene una unidad de medida por ID y tenant
 */
export async function findUnidadByIdAndTenant(id: number, tenantId: number) {
  return await db.unidadesMedida.findFirst({
    where: {
      id,
      tenant_id: tenantId,
    },
  });
}

/**
 * Crea una nueva unidad de medida para el tenant
 */
export async function createUnidadMedida(data: CreateUnidadMedidaDTO, tenantId: number) {
  // Verificar si ya existe el código
  const existente = await db.unidadesMedida.findFirst({
    where: {
      tenant_id: tenantId,
      codigo: data.codigo,
    },
  });

  if (existente) {
    throw new Error(
      `Ya existe una unidad de medida con el código "${data.codigo}". ` +
      `Las unidades del catálogo SUNAT ya fueron creadas automáticamente al registrar el tenant. ` +
      `Solo necesitas crear unidades personalizadas que no existan en el catálogo oficial.`
    );
  }

  return await db.unidadesMedida.create({
    data: {
      ...data,
      tenant_id: tenantId,
    },
  });
}

/**
 * Actualiza una unidad de medida por ID y tenant
 */
export async function updateUnidadByIdAndTenant(
  id: number,
  tenantId: number,
  data: UpdateUnidadMedidaDTO
) {
  // Verificar que existe
  const unidad = await findUnidadByIdAndTenant(id, tenantId);
  if (!unidad) {
    throw new Error('Unidad de medida no encontrada');
  }

  // Si se está actualizando el código, verificar que no exista otro con ese código
  if (data.codigo && data.codigo !== unidad.codigo) {
    const existente = await db.unidadesMedida.findFirst({
      where: {
        tenant_id: tenantId,
        codigo: data.codigo,
        id: { not: id },
      },
    });

    if (existente) {
      throw new Error(`Ya existe una unidad de medida con el código "${data.codigo}"`);
    }
  }

  return await db.unidadesMedida.update({
    where: { id },
    data,
  });
}

/**
 * Elimina una unidad de medida (validando que no esté en uso)
 */
export async function deleteUnidadByIdAndTenant(id: number, tenantId: number) {
  // Verificar que existe
  const unidad = await findUnidadByIdAndTenant(id, tenantId);
  if (!unidad) {
    throw new Error('Unidad de medida no encontrada');
  }

  // Verificar que no esté siendo utilizada por productos
  const productosUsando = await db.productos.count({
    where: {
      unidad_medida_id: id,
      tenant_id: tenantId,
    },
  });

  if (productosUsando > 0) {
    throw new Error(
      `No se puede eliminar la unidad de medida "${unidad.nombre}" porque está siendo utilizada por ${productosUsando} producto(s)`
    );
  }

  return await db.unidadesMedida.delete({
    where: { id },
  });
}
