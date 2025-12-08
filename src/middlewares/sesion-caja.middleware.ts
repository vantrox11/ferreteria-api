import { type Response, type NextFunction } from 'express';
import { type RequestWithAuth } from './auth.middleware';
import { db } from '../config/db';

/**
 * Middleware que valida que el usuario tenga una sesión de caja activa
 * antes de permitir crear ventas.
 * 
 * Aplicar a: POST /api/ventas
 */
export async function requireSesionCajaActiva(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.user!.tenantId;
    const usuarioId = req.user!.id;

    const sesion = await db.sesionesCaja.findFirst({
      where: {
        tenant_id: tenantId,
        usuario_id: usuarioId,
        estado: 'ABIERTA',
      },
    });

    if (!sesion) {
      return res.status(403).json({
        error: 'No tienes una sesión de caja activa',
        mensaje: 'Debes abrir una sesión antes de registrar ventas',
        requiere_accion: 'APERTURA_SESION',
      });
    }

    // Adjuntar sesionCajaId al request para uso posterior en el controlador
    (req as any).sesionCajaId = sesion.id;
    next();
  } catch (error: any) {
    console.error('Error al verificar sesión de caja:', error);
    res.status(500).json({ error: 'Error al verificar sesión de caja' });
  }
}
