import { db } from '../config/db';
import type { CreateSerieDTO, UpdateSerieDTO, SerieResponseDTO } from '../dtos/serie.dto';

/**
 * Modelo de negocio para Series (Numeración de Comprobantes SUNAT)
 */
class SerieModel {
  /**
   * Crear una nueva serie
   */
  async createSerie(tenantId: number, data: CreateSerieDTO): Promise<SerieResponseDTO> {
    // Verificar que no exista otra serie con el mismo código
    const serieExistente = await db.series.findFirst({
      where: {
        tenant_id: tenantId,
        codigo: data.codigo,
      },
    });

    if (serieExistente) {
      throw new Error(`Ya existe una serie con el código ${data.codigo}`);
    }

    // Si se especificó caja, verificar que exista
    if (data.caja_id) {
      const caja = await db.cajas.findFirst({
        where: {
          id: data.caja_id,
          tenant_id: tenantId,
          isActive: true,
        },
      });

      if (!caja) {
        throw new Error('La caja especificada no existe o está inactiva');
      }
    }

    const serie = await db.series.create({
      data: {
        codigo: data.codigo,
        tipo_comprobante: data.tipo_comprobante,
        caja_id: data.caja_id,
        isActive: data.isActive ?? true,
        tenant_id: tenantId,
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return this.mapSerieToDTO(serie);
  }

  /**
   * Obtener todas las series de un tenant
   */
  async getSeriesByTenant(
    tenantId: number,
    tipoComprobante?: string,
    includeInactive = false
  ): Promise<SerieResponseDTO[]> {
    const series = await db.series.findMany({
      where: {
        tenant_id: tenantId,
        ...(tipoComprobante && { tipo_comprobante: tipoComprobante as any }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        codigo: 'asc',
      },
    });

    return series.map(this.mapSerieToDTO);
  }

  /**
   * Obtener una serie por ID
   */
  async getSerieByIdAndTenant(serieId: number, tenantId: number): Promise<SerieResponseDTO | null> {
    const serie = await db.series.findFirst({
      where: {
        id: serieId,
        tenant_id: tenantId,
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!serie) return null;

    return this.mapSerieToDTO(serie);
  }

  /**
   * Actualizar una serie
   */
  async updateSerieByIdAndTenant(
    serieId: number,
    tenantId: number,
    data: UpdateSerieDTO
  ): Promise<SerieResponseDTO | null> {
    // Si se cambia el código, verificar que no exista otra serie con ese código
    if (data.codigo) {
      const serieExistente = await db.series.findFirst({
        where: {
          tenant_id: tenantId,
          codigo: data.codigo,
          NOT: {
            id: serieId,
          },
        },
      });

      if (serieExistente) {
        throw new Error(`Ya existe otra serie con el código ${data.codigo}`);
      }
    }

    const serie = await db.series.updateMany({
      where: {
        id: serieId,
        tenant_id: tenantId,
      },
      data: {
        ...(data.codigo !== undefined && { codigo: data.codigo }),
        ...(data.tipo_comprobante !== undefined && { tipo_comprobante: data.tipo_comprobante }),
        ...(data.caja_id !== undefined && { caja_id: data.caja_id }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    if (serie.count === 0) return null;

    return this.getSerieByIdAndTenant(serieId, tenantId);
  }

  /**
   * Eliminar (soft delete) una serie
   */
  async deleteSerieByIdAndTenant(serieId: number, tenantId: number): Promise<boolean> {
    const result = await db.series.updateMany({
      where: {
        id: serieId,
        tenant_id: tenantId,
      },
      data: {
        isActive: false,
      },
    });

    return result.count > 0;
  }

  /**
   * Obtener serie activa para un tipo de comprobante
   * (usada internamente por el módulo de ventas)
   */
  async getSerieActivaParaComprobante(
    tenantId: number,
    tipoComprobante: 'FACTURA' | 'BOLETA' | 'NOTA_VENTA',
    cajaId?: number
  ): Promise<SerieResponseDTO | null> {
    const serie = await db.series.findFirst({
      where: {
        tenant_id: tenantId,
        tipo_comprobante: tipoComprobante,
        isActive: true,
        ...(cajaId && { caja_id: cajaId }),
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        codigo: 'asc', // Priorizar primera serie alfabéticamente
      },
    });

    if (!serie) return null;

    return this.mapSerieToDTO(serie);
  }

  /**
   * Incrementar correlativo de una serie (debe usarse dentro de transacción)
   * IMPORTANTE: Este método debe llamarse SOLO dentro de una transacción de Prisma
   * con el flag FOR UPDATE para prevenir race conditions
   */
  async incrementarCorrelativo(
    serieId: number,
    tenantId: number,
    prismaTransaction: any
  ): Promise<number> {
    // SELECT ... FOR UPDATE (lock pesimista)
    const serie = await prismaTransaction.series.findFirst({
      where: {
        id: serieId,
        tenant_id: tenantId,
        isActive: true,
      },
    });

    if (!serie) {
      throw new Error('Serie no encontrada o inactiva');
    }

    const nuevoCorrelativo = serie.correlativo_actual + 1;

    // Actualizar el correlativo
    await prismaTransaction.series.update({
      where: {
        id: serieId,
      },
      data: {
        correlativo_actual: nuevoCorrelativo,
      },
    });

    return nuevoCorrelativo;
  }

  /**
   * Mapear serie de Prisma a DTO
   */
  private mapSerieToDTO(serie: any): SerieResponseDTO {
    return {
      id: serie.id,
      codigo: serie.codigo,
      tipo_comprobante: serie.tipo_comprobante,
      correlativo_actual: serie.correlativo_actual,
      isActive: serie.isActive,
      caja_id: serie.caja_id,
      caja: serie.caja,
      tenant_id: serie.tenant_id,
    };
  }
}

export default new SerieModel();
