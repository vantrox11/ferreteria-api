import { db } from '../config/db';
import { type Prisma } from '@prisma/client';

/**
 * Busca un tenant por su subdominio
 */
export const findTenantBySubdominio = async (subdominio: string) => {
  return db.tenants.findUnique({
    where: { subdominio },
  });
};

/**
 * Crea un nuevo tenant dentro de una transacción
 * Inicializa configuración con datos básicos de la empresa
 */
export const createTenant = async (
  data: { nombre_empresa: string, subdominio: string },
  tx: Prisma.TransactionClient
) => {
  return tx.tenants.create({
    data: {
      nombre_empresa: data.nombre_empresa,
      subdominio: data.subdominio,
      configuracion: JSON.stringify({
        empresa: {
          nombre_empresa: data.nombre_empresa,
          ruc: null,
          direccion: null,
          telefono: null,
          email: null
        },
        fiscal: {
          tasa_igv_global: 18.0,
          afectacion_igv_defecto: 'GRAVADO'
        }
      })
    },
  });
};

/**
 * Busca un tenant por su ID
 */
export const findTenantById = async (id: number) => {
  return db.tenants.findUnique({
    where: { id },
  });
};

/**
 * Activa un tenant estableciendo isActive=true
 */
export const activateTenantById = async (
  id: number,
  tx?: any // Prisma.TransactionClient o cliente extendido
) => {
  const prismaClient = tx || db;
  return prismaClient.tenants.update({
    where: { id },
    data: { isActive: true },
  });
};

/**
 * Actualiza la configuración JSON del tenant
 */
export const updateTenantConfiguracionById = async (
  id: number,
  configuracion: Prisma.JsonValue
) => {
  return db.tenants.update({
    where: { id },
    data: { configuracion: JSON.stringify(configuracion) },
  });
};

/**
 * Obtiene la configuración tributaria del tenant
 * Retorna valores por defecto si no existe configuración
 */
export const getTenantFiscalConfig = async (tenantId: number) => {
  const tenant = await db.tenants.findUnique({
    where: { id: tenantId },
    select: { configuracion: true },
  });

  const config = tenant?.configuracion ? JSON.parse(tenant.configuracion) : {};
  const facturacion = config.facturacion || {};

  return {
    impuesto_nombre: facturacion.impuesto_nombre || 'IGV',
    tasa_impuesto: facturacion.tasa_impuesto ?? 18.00,
    es_agente_retencion: facturacion.es_agente_retencion || false,
    exonerado_regional: facturacion.exonerado_regional || false,
  };
};

/**
 * Actualiza solo la configuración tributaria del tenant
 */
export const updateTenantFiscalConfig = async (
  tenantId: number,
  fiscalConfig: {
    impuesto_nombre?: string;
    tasa_impuesto?: number;
    es_agente_retencion?: boolean;
    exonerado_regional?: boolean;
  }
) => {
  const tenant = await findTenantById(tenantId);
  if (!tenant) throw new Error('Tenant no encontrado');

  const currentConfig = tenant.configuracion ? JSON.parse(tenant.configuracion) : {};
  const updatedConfig = {
    ...currentConfig,
    facturacion: {
      ...(currentConfig.facturacion || {}),
      ...fiscalConfig,
    },
  };

  return updateTenantConfiguracionById(tenantId, updatedConfig as Prisma.JsonValue);
};
