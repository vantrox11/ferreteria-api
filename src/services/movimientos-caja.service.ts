import { db } from '../config/db';
import type {
  CreateMovimientoCajaDTO,
  MovimientoCajaResponseDTO,
} from '../dtos/movimiento-caja.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Modelo de negocio para Movimientos de Caja
 */
class MovimientoCajaModel {
  /**
   * Crear un nuevo movimiento de caja (ingreso o egreso manual)
   */
  async createMovimiento(
    tenantId: number,
    usuarioId: number,
    data: CreateMovimientoCajaDTO
  ): Promise<MovimientoCajaResponseDTO> {
    // Verificar que el usuario tenga una sesión activa
    const sesionActiva = await db.sesionesCaja.findFirst({
      where: {
        tenant_id: tenantId,
        usuario_id: usuarioId,
        estado: 'ABIERTA',
      },
    });

    if (!sesionActiva) {
      throw new Error('No tienes una sesión de caja activa. Debes abrir una sesión primero.');
    }

    // ✅ VALIDACIÓN: Rechazar descripciones vagas para movimientos manuales
    // Si no hay FK explícita a venta, nota_credito o pago, es un movimiento manual
    const esMovimientoManual = !data.venta_id && !data.nota_credito_id && !data.pago_id;

    if (esMovimientoManual) {
      const descripcionLower = data.descripcion.toLowerCase();
      const descripcionesProhibidas = [
        'egreso',
        'ingreso',
        'devolución',
        'devolucion',
        'varios',
        'pago',
        'cobro',
      ];

      // Si la descripción SOLO contiene palabras prohibidas sin contexto
      const soloDescripcionVaga = descripcionesProhibidas.some(
        (prohibida) => descripcionLower.trim() === prohibida
      );

      if (soloDescripcionVaga) {
        throw Object.assign(
          new Error(
            'Descripción muy vaga. Use formato detallado: "{Acción} - {Concepto} - {Referencia}". ' +
            'Ejemplo: "Egreso - Compra útiles - Factura 001-123"'
          ),
          { code: 'DESCRIPCION_VAGA' }
        );
      }
    }

    const movimiento = await db.movimientosCaja.create({
      data: {
        tipo: data.tipo,
        monto: new Decimal(data.monto),
        descripcion: data.descripcion,
        // FKs explícitas para integridad referencial
        venta_id: data.venta_id ?? null,
        nota_credito_id: data.nota_credito_id ?? null,
        pago_id: data.pago_id ?? null,
        es_manual: esMovimientoManual,
        sesion_caja_id: sesionActiva.id,
        tenant_id: tenantId,
      },
      include: {
        sesion_caja: {
          select: {
            id: true,
            caja: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    return this.mapMovimientoToDTO(movimiento);
  }

  /**
   * Obtener movimientos de una sesión específica
   */
  async getMovimientosBySesion(
    sesionId: number,
    tenantId: number
  ): Promise<MovimientoCajaResponseDTO[]> {
    const movimientos = await db.movimientosCaja.findMany({
      where: {
        sesion_caja_id: sesionId,
        tenant_id: tenantId,
      },
      include: {
        sesion_caja: {
          select: {
            id: true,
            caja: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    return movimientos.map(this.mapMovimientoToDTO);
  }

  /**
   * Obtener movimientos de la sesión activa del usuario
   */
  async getMovimientosSesionActiva(
    tenantId: number,
    usuarioId: number
  ): Promise<MovimientoCajaResponseDTO[]> {
    const sesionActiva = await db.sesionesCaja.findFirst({
      where: {
        tenant_id: tenantId,
        usuario_id: usuarioId,
        estado: 'ABIERTA',
      },
    });

    if (!sesionActiva) {
      throw new Error('No tienes una sesión de caja activa');
    }

    return this.getMovimientosBySesion(sesionActiva.id, tenantId);
  }

  /**
   * Mapear movimiento de Prisma a DTO
   * Devuelve las FKs exactamente como están en la BD (sin derivación)
   */
  private mapMovimientoToDTO(movimiento: any): MovimientoCajaResponseDTO {
    return {
      id: movimiento.id,
      tipo: movimiento.tipo,
      monto: Number(movimiento.monto),
      descripcion: movimiento.descripcion,
      // FKs explícitas - estructura real de la BD
      venta_id: movimiento.venta_id,
      nota_credito_id: movimiento.nota_credito_id,
      pago_id: movimiento.pago_id,
      es_manual: movimiento.es_manual,
      fecha: movimiento.fecha,
      sesion_caja_id: movimiento.sesion_caja_id,
      sesion_caja: movimiento.sesion_caja,
      tenant_id: movimiento.tenant_id,
    };
  }
}

export default new MovimientoCajaModel();
