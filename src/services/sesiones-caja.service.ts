import { db } from '../config/db';
import type {
  AperturaSesionCajaDTO,
  CierreSesionCajaDTO,
  SesionCajaResponseDTO,
  SesionActivaResponseDTO,
} from '../dtos/sesion-caja.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Modelo de negocio para Sesiones de Caja
 */
class SesionCajaModel {
  /**
   * Abrir una nueva sesión de caja
   */
  async abrirSesion(
    tenantId: number,
    usuarioId: number,
    data: AperturaSesionCajaDTO
  ): Promise<SesionCajaResponseDTO> {
    // VALIDACIÓN 1: Datos de entrada
    if (!data.caja_id || typeof data.caja_id !== 'number') {
      throw new Error('El ID de la caja es requerido y debe ser un número válido');
    }

    if (data.monto_inicial === undefined || data.monto_inicial === null) {
      throw new Error('El monto inicial es requerido');
    }

    if (data.monto_inicial < 0) {
      throw new Error('El monto inicial no puede ser negativo');
    }

    // VALIDACIÓN 2: Verificar que no exista otra sesión activa para este usuario
    const sesionActiva = await db.sesionesCaja.findFirst({
      where: {
        tenant_id: tenantId,
        usuario_id: usuarioId,
        estado: 'ABIERTA',
      },
    });

    if (sesionActiva) {
      throw new Error('Ya tienes una sesión de caja activa. Debes cerrarla antes de abrir una nueva.');
    }

    // VALIDACIÓN 3 (CRÍTICA): Verificar que la CAJA FÍSICA no esté ocupada por OTRO usuario
    // "Un Cajón, Un Responsable" - Estándar de la industria
    const cajaOcupada = await db.sesionesCaja.findFirst({
      where: {
        caja_id: data.caja_id,
        tenant_id: tenantId,
        estado: 'ABIERTA',
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (cajaOcupada) {
      const nombreUsuario = cajaOcupada.usuario.nombre || cajaOcupada.usuario.email;
      throw new Error(
        `La caja ya está siendo usada por ${nombreUsuario}. ` +
        `Se requiere cierre administrativo antes de iniciar un nuevo turno. ` +
        `Contacta a un supervisor.`
      );
    }

    // VALIDACIÓN 4: Verificar que la caja exista y esté activa
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

    const sesion = await db.sesionesCaja.create({
      data: {
        caja_id: data.caja_id,
        usuario_id: usuarioId,
        monto_inicial: new Decimal(data.monto_inicial),
        estado: 'ABIERTA',
        tenant_id: tenantId,
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return this.mapSesionToDTO(sesion);
  }

  /**
   * Cerrar una sesión de caja
   */
  async cerrarSesion(
    sesionId: number,
    tenantId: number,
    usuarioId: number,
    data: CierreSesionCajaDTO
  ): Promise<SesionCajaResponseDTO> {
    // VALIDACIÓN 1: Datos de entrada
    if (!sesionId || typeof sesionId !== 'number') {
      throw new Error('El ID de la sesión es requerido y debe ser un número válido');
    }

    if (data.monto_final === undefined || data.monto_final === null) {
      throw new Error('El monto final es requerido');
    }

    if (data.monto_final < 0) {
      throw new Error('El monto final no puede ser negativo');
    }

    // VALIDACIÓN 2: Verificar que la sesión existe
    const sesion = await db.sesionesCaja.findFirst({
      where: {
        id: sesionId,
        tenant_id: tenantId,
      },
    });

    if (!sesion) {
      throw new Error('Sesión no encontrada');
    }

    // VALIDACIÓN 3: Verificar que la sesión esté ABIERTA
    if (sesion.estado !== 'ABIERTA') {
      throw new Error('La sesión ya está cerrada');
    }

    // VALIDACIÓN 4 (CRÍTICA): Verificar que el usuario sea el DUEÑO de la sesión
    if (sesion.usuario_id !== usuarioId) {
      throw new Error('No tienes permiso para cerrar esta sesión. Solo el usuario que la abrió puede cerrarla.');
    }

    // Calcular totales
    const ventas = await db.ventas.findMany({
      where: {
        sesion_caja_id: sesionId,
        tenant_id: tenantId,
      },
      select: {
        total: true,
      },
    });

    const movimientos = await db.movimientosCaja.findMany({
      where: {
        sesion_caja_id: sesionId,
        tenant_id: tenantId,
      },
      select: {
        tipo: true,
        monto: true,
      },
    });

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    // Calcular monto esperado: monto_inicial + ventas + ingresos - egresos
    const montoEsperado = Number(sesion.monto_inicial) + totalVentas + totalIngresos - totalEgresos;

    // Calcular diferencia
    const diferencia = data.monto_final - montoEsperado;

    // Actualizar sesión
    const sesionActualizada = await db.sesionesCaja.update({
      where: {
        id: sesionId,
      },
      data: {
        fecha_cierre: new Date(),
        monto_final: new Decimal(data.monto_final),
        total_ventas: new Decimal(totalVentas),
        total_egresos: new Decimal(totalEgresos),
        diferencia: new Decimal(diferencia),
        estado: 'CERRADA',
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return this.mapSesionToDTO(sesionActualizada);
  }

  /**
   * Cierre Administrativo: Permite a un supervisor cerrar la sesión de otro usuario
   * Caso de uso: Usuario dejó sesión abierta y no está disponible para cerrarla
   * 
   * @param sesionId - ID de la sesión a cerrar
   * @param tenantId - ID del tenant
   * @param adminUsuarioId - ID del supervisor/admin que ejecuta el cierre
   * @param data - Datos del cierre (monto final y motivo)
   * @returns Sesión cerrada con auditoría del cierre administrativo
   */
  async cerrarSesionAdministrativo(
    sesionId: number,
    tenantId: number,
    adminUsuarioId: number,
    data: { monto_final: number; motivo: string }
  ): Promise<SesionCajaResponseDTO> {
    // VALIDACIÓN 1: Datos de entrada
    if (!sesionId || typeof sesionId !== 'number') {
      throw new Error('El ID de la sesión es requerido y debe ser un número válido');
    }

    if (data.monto_final === undefined || data.monto_final === null) {
      throw new Error('El monto final es requerido');
    }

    if (data.monto_final < 0) {
      throw new Error('El monto final no puede ser negativo');
    }

    if (!data.motivo || data.motivo.trim().length < 10) {
      throw new Error('El motivo del cierre administrativo es requerido y debe tener al menos 10 caracteres');
    }

    // VALIDACIÓN 2: Verificar que la sesión existe y está abierta (SIN validar que sea del admin)
    const sesion = await db.sesionesCaja.findFirst({
      where: {
        id: sesionId,
        tenant_id: tenantId,
        estado: 'ABIERTA',
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!sesion) {
      throw new Error('Sesión no encontrada o ya está cerrada');
    }

    // Calcular totales (mismo proceso que cierre normal)
    const ventas = await db.ventas.findMany({
      where: {
        sesion_caja_id: sesionId,
        tenant_id: tenantId,
      },
      select: {
        total: true,
      },
    });

    const movimientos = await db.movimientosCaja.findMany({
      where: {
        sesion_caja_id: sesionId,
        tenant_id: tenantId,
      },
      select: {
        tipo: true,
        monto: true,
      },
    });

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);
    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const montoEsperado = Number(sesion.monto_inicial) + totalVentas + totalIngresos - totalEgresos;
    const diferencia = data.monto_final - montoEsperado;

    // AUDITORÍA: Registrar información del cierre administrativo
    // Guardamos el motivo en un campo JSON o en tabla de logs
    // Por ahora lo incluimos como comentario para futuro log de auditoría
    const metadataCierre = {
      tipo_cierre: 'ADMINISTRATIVO',
      cerrado_por_admin_id: adminUsuarioId,
      usuario_original_id: sesion.usuario_id,
      usuario_original_nombre: sesion.usuario.nombre || sesion.usuario.email,
      motivo: data.motivo,
      fecha_cierre_admin: new Date().toISOString(),
    };

    // TODO: Guardar metadataCierre en tabla de auditoría cuando se implemente
    console.log('[CIERRE ADMINISTRATIVO]', metadataCierre);

    // Actualizar sesión (mismo proceso que cierre normal)
    const sesionCerrada = await db.sesionesCaja.update({
      where: {
        id: sesionId,
      },
      data: {
        fecha_cierre: new Date(),
        monto_final: new Decimal(data.monto_final),
        total_ventas: new Decimal(totalVentas),
        total_egresos: new Decimal(totalEgresos),
        diferencia: new Decimal(diferencia),
        estado: 'CERRADA',
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return this.mapSesionToDTO(sesionCerrada);
  }

  /**
   * Obtener sesión activa del usuario
   */
  async getSesionActiva(tenantId: number, usuarioId: number): Promise<SesionActivaResponseDTO> {
    const sesion = await db.sesionesCaja.findFirst({
      where: {
        tenant_id: tenantId,
        usuario_id: usuarioId,
        estado: 'ABIERTA',
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!sesion) {
      return {
        sesion: null,
        tiene_sesion_activa: false,
      };
    }

    // Calcular totales en tiempo real para sesiones ABIERTAS
    const ventas = await db.ventas.findMany({
      where: {
        sesion_caja_id: sesion.id,
        tenant_id: tenantId,
      },
      select: {
        total: true,
      },
    });

    const movimientos = await db.movimientosCaja.findMany({
      where: {
        sesion_caja_id: sesion.id,
        tenant_id: tenantId,
      },
      select: {
        tipo: true,
        monto: true,
      },
    });

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    // Mapear sesión con totales calculados
    const sesionDTO = this.mapSesionToDTO(sesion);
    sesionDTO.total_ventas = totalVentas;
    sesionDTO.total_egresos = totalEgresos;
    sesionDTO.total_ingresos = totalIngresos;

    return {
      sesion: sesionDTO,
      tiene_sesion_activa: true,
    };
  }

  /**
   * Obtener historial de sesiones
   */
  async getHistorialSesiones(
    tenantId: number,
    cajaId?: number,
    usuarioId?: number,
    limit = 50
  ): Promise<SesionCajaResponseDTO[]> {
    const sesiones = await db.sesionesCaja.findMany({
      where: {
        tenant_id: tenantId,
        ...(cajaId && { caja_id: cajaId }),
        ...(usuarioId && { usuario_id: usuarioId }),
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fecha_apertura: 'desc',
      },
      take: limit,
    });

    return sesiones.map(this.mapSesionToDTO);
  }

  /**
   * Obtener detalle de una sesión
   */
  async getSesionById(sesionId: number, tenantId: number): Promise<SesionCajaResponseDTO | null> {
    const sesion = await db.sesionesCaja.findFirst({
      where: {
        id: sesionId,
        tenant_id: tenantId,
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!sesion) return null;

    return this.mapSesionToDTO(sesion);
  }

  /**
   * Obtener monitor activo - Todas las cajas ABIERTAS con KPIs calculados
   */
  async getMonitorActivo(tenantId: number) {
    const sesionesAbiertas = await db.sesionesCaja.findMany({
      where: {
        tenant_id: tenantId,
        estado: 'ABIERTA',
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        movimientos: {
          select: {
            tipo: true,
            monto: true,
          },
        },
      },
      orderBy: {
        fecha_apertura: 'desc',
      },
    });

    // Calcular KPIs para cada sesión
    const data = sesionesAbiertas.map((sesion) => {
      const totalIngresos = sesion.movimientos
        .filter((m) => m.tipo === 'INGRESO')
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const totalEgresos = sesion.movimientos
        .filter((m) => m.tipo === 'EGRESO')
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const saldoActual = Number(sesion.monto_inicial) + totalIngresos - totalEgresos;
      const cantidadTransacciones = sesion.movimientos.length;

      return {
        id: sesion.id,
        caja: sesion.caja,
        usuario: sesion.usuario,
        hora_apertura: sesion.fecha_apertura,
        monto_inicial: Number(sesion.monto_inicial),
        saldo_actual: saldoActual,
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        cantidad_transacciones: cantidadTransacciones,
        estado: sesion.estado,
      };
    });

    return { data };
  }

  /**
   * Obtener detalle completo de una sesión (abierta o cerrada)
   */
  async getDetalleCompleto(sesionId: number, tenantId: number) {
    const sesion = await db.sesionesCaja.findFirst({
      where: {
        id: sesionId,
        tenant_id: tenantId,
      },
      include: {
        caja: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        movimientos: {
          select: {
            id: true,
            tipo: true,
            monto: true,
            descripcion: true,
            // FKs explícitas para determinar tipo de referencia
            venta_id: true,
            nota_credito_id: true,
            pago_id: true,
            es_manual: true,
            fecha: true,
          },
          orderBy: {
            fecha: 'asc',
          },
        },
      },
    });

    if (!sesion) {
      throw new Error('Sesión no encontrada');
    }

    // Calcular KPIs
    const totalIngresos = sesion.movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalEgresos = sesion.movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const saldoTeorico = Number(sesion.monto_inicial) + totalIngresos - totalEgresos;

    const kpis = {
      saldo_inicial: Number(sesion.monto_inicial),
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_teorico: saldoTeorico,
      ...(sesion.estado === 'CERRADA' && {
        monto_real: sesion.monto_final ? Number(sesion.monto_final) : null,
        diferencia: sesion.diferencia ? Number(sesion.diferencia) : null,
      }),
    };

    // Desglose por método de pago (solo de ventas asociadas)
    const ventas = await db.ventas.findMany({
      where: {
        sesion_caja_id: sesionId,
        tenant_id: tenantId,
      },
      select: {
        metodo_pago: true,
        total: true,
      },
    });

    const desglose_metodos = {
      EFECTIVO: 0,
      TARJETA: 0,
      YAPE: 0,
      PLIN: 0,
      TRANSFERENCIA: 0,
    };

    ventas.forEach((venta) => {
      const metodo = venta.metodo_pago as keyof typeof desglose_metodos;
      if (metodo in desglose_metodos) {
        desglose_metodos[metodo] += Number(venta.total);
      }
    });

    // Resumen operativo
    const cantidadVentas = ventas.length;
    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    // Contar devoluciones (NC que generaron egreso automático)
    const devoluciones = sesion.movimientos.filter(
      (m) => m.tipo === 'EGRESO' && m.nota_credito_id !== null
    );
    const cantidadDevoluciones = devoluciones.length;
    const montoDevoluciones = devoluciones.reduce((sum, m) => sum + Number(m.monto), 0);

    const resumen_operativo = {
      cantidad_ventas: cantidadVentas,
      ticket_promedio: ticketPromedio,
      cantidad_devoluciones: cantidadDevoluciones,
      monto_devoluciones: montoDevoluciones,
    };

    // Mapear movimientos con FKs explícitas (estructura real de BD)
    const movimientos = sesion.movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      descripcion: m.descripcion,
      monto: Number(m.monto),
      fecha_hora: m.fecha,
      // FKs directas - estructura real
      venta_id: m.venta_id,
      nota_credito_id: m.nota_credito_id,
      pago_id: m.pago_id,
      es_manual: m.es_manual,
    }));

    return {
      sesion: this.mapSesionToDTO(sesion),
      kpis,
      desglose_metodos,
      resumen_operativo,
      movimientos,
    };
  }

  /**
   * Obtener historial de auditoría con filtros avanzados
   */
  async getHistorialAuditoria(
    tenantId: number,
    filters: {
      fecha_inicio?: Date;
      fecha_fin?: Date;
      usuario_id?: number;
      solo_descuadres?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const { fecha_inicio, fecha_fin, usuario_id, solo_descuadres, page = 1, limit = 50 } = filters;

    const where: any = {
      tenant_id: tenantId,
      estado: 'CERRADA', // Solo sesiones cerradas para auditoría
    };

    if (fecha_inicio || fecha_fin) {
      where.fecha_cierre = {};
      if (fecha_inicio) where.fecha_cierre.gte = fecha_inicio;
      if (fecha_fin) where.fecha_cierre.lte = fecha_fin;
    }

    if (usuario_id) {
      where.usuario_id = usuario_id;
    }

    // Si solo queremos descuadres, filtrar por diferencia != 0
    if (solo_descuadres) {
      where.diferencia = {
        not: 0,
      };
    }

    const [sesiones, total] = await Promise.all([
      db.sesionesCaja.findMany({
        where,
        include: {
          caja: {
            select: {
              id: true,
              nombre: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: {
          fecha_cierre: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sesionesCaja.count({ where }),
    ]);

    const data = sesiones.map((sesion) => ({
      id: sesion.id,
      caja: sesion.caja,
      usuario: sesion.usuario,
      fecha_apertura: sesion.fecha_apertura,
      fecha_cierre: sesion.fecha_cierre,
      monto_inicial: Number(sesion.monto_inicial),
      total_ventas: sesion.total_ventas ? Number(sesion.total_ventas) : 0,
      monto_teorico: Number(sesion.monto_inicial) +
        (sesion.total_ingresos ? Number(sesion.total_ingresos) : 0) -
        (sesion.total_egresos ? Number(sesion.total_egresos) : 0),
      monto_real: sesion.monto_final ? Number(sesion.monto_final) : null,
      diferencia: sesion.diferencia ? Number(sesion.diferencia) : 0,
      tipo_cierre: 'NORMAL', // TODO: Agregar campo en schema si se necesita distinguir
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mapear sesión de Prisma a DTO
   */
  private mapSesionToDTO(sesion: any): SesionCajaResponseDTO {
    return {
      id: sesion.id,
      fecha_apertura: sesion.fecha_apertura,
      fecha_cierre: sesion.fecha_cierre,
      monto_inicial: Number(sesion.monto_inicial),
      monto_final: sesion.monto_final ? Number(sesion.monto_final) : null,
      total_ventas: sesion.total_ventas ? Number(sesion.total_ventas) : null,
      total_egresos: sesion.total_egresos ? Number(sesion.total_egresos) : null,
      diferencia: sesion.diferencia ? Number(sesion.diferencia) : null,
      estado: sesion.estado,
      caja_id: sesion.caja_id,
      caja: sesion.caja,
      usuario_id: sesion.usuario_id,
      usuario: sesion.usuario,
      tenant_id: sesion.tenant_id,
    };
  }
}

export default new SesionCajaModel();
