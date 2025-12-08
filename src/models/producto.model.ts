import { db } from '../config/db';
import { type Prisma } from '@prisma/client';
import { type CreateProductoDTO, type UpdateProductoDTO } from '../dtos/producto.dto';
import * as tenantModel from './tenant.model';

/**
 * Calcula precio_venta desde precio_base según afectación IGV
 */
const calcularPrecioVenta = async (producto: any, tenantId: number): Promise<any> => {
  const fiscalConfig = await tenantModel.getTenantFiscalConfig(tenantId);
  
  let precio_venta = Number(producto.precio_base);
  
  // Si NO está exonerado regionalmente Y el producto es GRAVADO, aplicar IGV
  if (!fiscalConfig.exonerado_regional && producto.afectacion_igv === 'GRAVADO') {
    const tasa = fiscalConfig.tasa_impuesto / 100;
    precio_venta = Number(producto.precio_base) * (1 + tasa);
  }
  
  return {
    ...producto,
    precio_venta: Number(precio_venta.toFixed(2)),
  };
};

/**
 * Obtiene productos de un tenant con paginación y búsqueda (SERVER-SIDE)
 */
export const findProductosPaginados = async (
  tenantId: number,
  params: { skip: number; take: number; search?: string }
) => {
  const { skip, take, search } = params;

  // Construir condición de búsqueda
  const whereClause: Prisma.ProductosWhereInput = {
    tenant_id: tenantId,
    isActive: true,
    ...(search && {
      OR: [
        { nombre: { contains: search } },
        { sku: { contains: search } },
        { descripcion: { contains: search } },
      ],
    }),
  };

  // Ejecutar dos consultas en transacción para obtener total y datos
  const [total, productos] = await db.$transaction([
    db.productos.count({ where: whereClause }),
    db.productos.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
        marca: {
          select: {
            id: true,
            nombre: true,
          },
        },
        unidad_medida: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            permite_decimales: true,
          },
        },
      },
    }),
  ]);

  // Calcular precio_venta para cada producto
  const data = await Promise.all(
    productos.map(p => calcularPrecioVenta(p, tenantId))
  );

  return { total, data };
};

/**
 * Obtiene todos los productos de un tenant específico (solo activos)
 * @deprecated Usar findProductosPaginados para listas grandes
 */
export const findAllProductosByTenant = async (tenantId: number) => {
  return db.productos.findMany({
    where: {
      tenant_id: tenantId,
      isActive: true,
    },
    include: {
      categoria: {
        select: {
          nombre: true,
        },
      },
    },
  });
};

/**
 * Busca un producto por id validando pertenencia al tenant
 */
export const findProductoByIdAndTenant = async (tenantId: number, id: number) => {
  const producto = await db.productos.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      categoria: { 
        select: { 
          id: true,
          nombre: true 
        } 
      },
      marca: {
        select: {
          id: true,
          nombre: true,
        },
      },
      unidad_medida: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          permite_decimales: true,
        },
      },
    },
  });
  
  if (!producto) return null;
  
  return calcularPrecioVenta(producto, tenantId);
};

/**
 * Crea un nuevo producto para un tenant específico
 * Implementa cálculo inverso: precio_venta (con IGV) → precio_base (sin IGV)
 */
export const createProducto = async (
  data: CreateProductoDTO,
  tenantId: number,
  tx?: Prisma.TransactionClient
) => {
  const prismaClient = tx || db;
  const { categoria_id, precio_venta, afectacion_igv, ...productoData } = data;

  // Validación multi-tenant: si se especifica categoría, debe pertenecer al mismo tenant
  if (categoria_id) {
    const categoria = await prismaClient.categorias.findUnique({
      where: { id: categoria_id },
      select: { id: true, tenant_id: true },
    });
    if (!categoria || categoria.tenant_id !== tenantId) {
      const err = new Error('La categoría no pertenece a este tenant');
      (err as any).code = 'TENANT_MISMATCH';
      throw err;
    }
  }

  // Obtener configuración tributaria del tenant
  const fiscalConfig = await tenantModel.getTenantFiscalConfig(tenantId);

  // CÁLCULO INVERSO: precio_venta (CON IGV) → precio_base (SIN IGV)
  let precio_base_calculado = precio_venta;

  // Si el tenant NO está exonerado regionalmente Y el producto es GRAVADO
  if (!fiscalConfig.exonerado_regional && afectacion_igv === 'GRAVADO') {
    const tasa = fiscalConfig.tasa_impuesto / 100; // 18% → 0.18
    precio_base_calculado = precio_venta / (1 + tasa);
  }
  // Si el producto es EXONERADO/INAFECTO o tenant exonerado, precio_base = precio_venta

  const producto = await prismaClient.productos.create({
    data: {
      ...productoData,
      precio_base: Number(precio_base_calculado.toFixed(2)),
      afectacion_igv: afectacion_igv,
      tenant_id: tenantId,
      ...(categoria_id && { categoria_id }),
    },
  });

  // Devolver con precio_venta calculado
  return calcularPrecioVenta(producto, tenantId);
};

/**
 * Actualiza un producto por id dentro de un tenant
 * Implementa cálculo inverso si se actualiza precio_venta o afectacion_igv
 */
export const updateProductoByIdAndTenant = async (
  tenantId: number,
  id: number,
  data: UpdateProductoDTO
) => {
  // Verificar existencia y pertenencia al tenant
  const existing = await db.productos.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;

  // Validar que la categoría pertenezca al tenant si se intenta cambiar
  if (data.categoria_id) {
    const categoria = await db.categorias.findUnique({
      where: { id: data.categoria_id },
      select: { id: true, tenant_id: true },
    });
    if (!categoria || categoria.tenant_id !== tenantId) {
      const err = new Error('La categoría no pertenece a este tenant');
      (err as any).code = 'TENANT_MISMATCH';
      throw err;
    }
  }

  // Preparar datos para actualización
  const updateData: any = { ...data };

  // CÁLCULO INVERSO si se proporciona precio_venta
  if (data.precio_venta !== undefined) {
    const fiscalConfig = await tenantModel.getTenantFiscalConfig(tenantId);
    const afectacion = data.afectacion_igv || existing.afectacion_igv;

    let precio_base_calculado = data.precio_venta;

    if (!fiscalConfig.exonerado_regional && afectacion === 'GRAVADO') {
      const tasa = fiscalConfig.tasa_impuesto / 100;
      precio_base_calculado = data.precio_venta / (1 + tasa);
    }

    updateData.precio_base = Number(precio_base_calculado.toFixed(2));
    delete updateData.precio_venta; // No existe en el schema
  }

  const producto = await db.productos.update({
    where: { id },
    data: updateData,
  });

  // Devolver con precio_venta calculado
  return calcularPrecioVenta(producto, tenantId);
};

/**
 * Desactiva un producto por id dentro de un tenant (borrado lógico)
 */
export const desactivarProductoByIdAndTenant = async (tenantId: number, id: number) => {
  const existing = await db.productos.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) return null;
  return db.productos.update({ 
    where: { id }, 
    data: { isActive: false } 
  });
};