import { db } from '../config/db';
import type { CreateCajaDTO, UpdateCajaDTO, CajaResponseDTO } from '../dtos/caja.dto';

/**
 * Modelo de negocio para Cajas (Puntos de Venta)
 */
class CajaModel {
  /**
   * Crear una nueva caja
   */
  async createCaja(tenantId: number, data: CreateCajaDTO): Promise<CajaResponseDTO> {
    const caja = await db.cajas.create({
      data: {
        nombre: data.nombre,
        isActive: data.isActive ?? true,
        tenant_id: tenantId,
      },
    });

    return caja as CajaResponseDTO;
  }

  /**
   * Obtener todas las cajas de un tenant
   */
  async getCajasByTenant(tenantId: number, includeInactive = false): Promise<CajaResponseDTO[]> {
    const cajas = await db.cajas.findMany({
      where: {
        tenant_id: tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return cajas as CajaResponseDTO[];
  }

  /**
   * Obtener una caja por ID
   */
  async getCajaByIdAndTenant(cajaId: number, tenantId: number): Promise<CajaResponseDTO | null> {
    const caja = await db.cajas.findFirst({
      where: {
        id: cajaId,
        tenant_id: tenantId,
      },
    });

    return caja as CajaResponseDTO | null;
  }

  /**
   * Actualizar una caja
   */
  async updateCajaByIdAndTenant(
    cajaId: number,
    tenantId: number,
    data: UpdateCajaDTO
  ): Promise<CajaResponseDTO | null> {
    const caja = await db.cajas.updateMany({
      where: {
        id: cajaId,
        tenant_id: tenantId,
      },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    if (caja.count === 0) return null;

    return this.getCajaByIdAndTenant(cajaId, tenantId);
  }

  /**
   * Eliminar (soft delete) una caja
   */
  async deleteCajaByIdAndTenant(cajaId: number, tenantId: number): Promise<boolean> {
    // Verificar si hay sesiones activas
    const sesionActiva = await db.sesionesCaja.findFirst({
      where: {
        caja_id: cajaId,
        tenant_id: tenantId,
        estado: 'ABIERTA',
      },
    });

    if (sesionActiva) {
      throw new Error('No se puede desactivar una caja con sesiones abiertas');
    }

    const result = await db.cajas.updateMany({
      where: {
        id: cajaId,
        tenant_id: tenantId,
      },
      data: {
        isActive: false,
      },
    });

    return result.count > 0;
  }
}

export default new CajaModel();
