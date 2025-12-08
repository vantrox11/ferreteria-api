import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as cobranzaModel from '../models/cobranza.model';
import { type CreatePagoDTO } from '../dtos/cobranza.dto';
import { db } from '../config/db';

/**
 * Listar cuentas por cobrar con paginación y filtros
 * GET /api/cobranzas
 */
export const getCobranzasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    // Extraer parámetros de paginación y filtros
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.q as string) || '';
    const cliente_id = req.query.cliente_id ? parseInt(req.query.cliente_id as string) : undefined;
    const estado = req.query.estado as any;
    const fecha_inicio = req.query.fecha_inicio ? new Date(req.query.fecha_inicio as string) : undefined;
    const fecha_fin = req.query.fecha_fin ? new Date(req.query.fecha_fin as string) : undefined;
    
    // Validar límites razonables
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * validLimit;
    
    // Obtener cuentas por cobrar paginadas
    const { total, data } = await cobranzaModel.findCobranzasPaginadas(tenantId, {
      skip,
      take: validLimit,
      search: search.trim() || undefined,
      cliente_id,
      estado,
      fecha_inicio,
      fecha_fin,
    });
    
    // Devolver datos con metadatos de paginación
    res.status(200).json({
      data,
      meta: {
        total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  }
);

/**
 * Obtener una cuenta por cobrar específica por ID
 * GET /api/cobranzas/:id
 */
export const getCuentaPorCobrarByIdHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    
    const cuenta = await cobranzaModel.findCuentaPorCobrarById(tenantId, Number(id));
    
    if (!cuenta) {
      res.status(404).json({ message: 'Cuenta por cobrar no encontrada.' });
      return;
    }
    
    res.status(200).json(cuenta);
  }
);

/**
 * Registrar un pago (amortización) en una cuenta por cobrar
 * POST /api/cobranzas/:id/pagos
 */
export const registrarPagoHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const usuarioId = req.user!.id;
    const { id } = req.params;
    const pagoData: CreatePagoDTO = req.body;
    
    try {
      const pago = await cobranzaModel.registrarPago(
        tenantId,
        Number(id),
        pagoData,
        usuarioId
      );
      
      res.status(201).json({
        message: 'Pago registrado exitosamente',
        pago,
      });
    } catch (error: any) {
      if (error?.code === 'MONTO_EXCEDE_DEUDA') {
        res.status(400).json({ message: error.message });
        return;
      }
      throw error;
    }
  }
);

/**
 * Obtener resumen de cobranzas (estadísticas)
 * GET /api/cobranzas/resumen
 */
export const getResumenCobranzasHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    
    const resumen = await cobranzaModel.getResumenCobranzas(tenantId);
    
    res.status(200).json(resumen);
  }
);

/**
 * Actualizar notas de una cuenta por cobrar
 * PATCH /api/cobranzas/:id
 */
export const updateCuentaPorCobrarHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { notas } = req.body;
    
    try {
      const cuentaActualizada = await cobranzaModel.updateCuentaPorCobrarNotas(
        tenantId,
        Number(id),
        notas
      );
      
      res.status(200).json({
        message: 'Cuenta por cobrar actualizada',
        cuenta: cuentaActualizada,
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        res.status(404).json({ message: 'Cuenta por cobrar no encontrada' });
        return;
      }
      throw error;
    }
  }
);

/**
 * Obtener línea de crédito disponible de un cliente
 * GET /api/cobranzas/clientes/:clienteId/credito-disponible
 */
export const getCreditoDisponibleHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const { clienteId } = req.params;
    
    // Obtener datos del cliente
    const cliente = await db.clientes.findFirst({
      where: {
        id: Number(clienteId),
        tenant_id: tenantId,
      },
      select: {
        id: true,
        nombre: true,
        limite_credito: true,
        dias_credito: true,
      },
    });
    
    console.log('💳 [CREDITO DISPONIBLE] Cliente obtenido de BD:', JSON.stringify(cliente, null, 2));
    
    if (!cliente) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }
    
    // Calcular deuda actual
    const deudaActual = await db.cuentasPorCobrar.aggregate({
      where: {
        tenant_id: tenantId,
        cliente_id: Number(clienteId),
        estado: {
          in: ['VIGENTE', 'POR_VENCER', 'VENCIDA'],
        },
      },
      _sum: {
        saldo_pendiente: true,
      },
    });
    
    const saldoPendiente = Number(deudaActual._sum.saldo_pendiente || 0);
    const limiteCredito = Number(cliente.limite_credito);
    const creditoDisponible = limiteCredito - saldoPendiente;
    
    res.status(200).json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
      },
      limite_credito: limiteCredito,
      deuda_actual: saldoPendiente,
      credito_disponible: creditoDisponible,
      dias_credito: cliente.dias_credito,
      tiene_credito_habilitado: limiteCredito > 0,
    });
  }
);
