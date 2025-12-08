import { type Request, type Response, type NextFunction } from 'express';
import { type RequestWithAuth } from './auth.middleware';
import * as auditService from '../services/audit.service';
import { AccionAuditoria } from '@prisma/client';
import { db } from '../config/db';

/**
 * Middleware de Auditoría Asíncrono
 * Intercepta requests POST/PUT/DELETE y registra en AuditoriaLogs
 * Sección 7.4 del DocumentodeEspecificacionTecnica.md
 */

// Mapeo de rutas a tablas de base de datos
const ROUTE_TO_TABLE_MAP: Record<string, string> = {
  '/api/productos': 'Productos',
  '/api/ventas': 'Ventas',
  '/api/clientes': 'Clientes',
  '/api/proveedores': 'Proveedores',
  '/api/categorias': 'Categorias',
  '/api/usuarios': 'Usuarios',
  '/api/pedidos': 'Pedidos',
  '/api/ordenes-compra': 'OrdenesCompra',
  '/api/inventario-ajustes': 'InventarioAjustes',
  '/api/cajas': 'Cajas',
  '/api/sesiones-caja': 'SesionesCaja',
  '/api/series': 'Series',
};

// Mapeo de métodos HTTP a acciones
const METHOD_TO_ACTION_MAP: Record<string, AccionAuditoria> = {
  POST: 'CREAR',
  PUT: 'ACTUALIZAR',
  DELETE: 'ELIMINAR',
  PATCH: 'ACTUALIZAR',
};

/**
 * Obtiene el estado actual de un registro antes de modificarlo
 */
const obtenerEstadoActual = async (
  tabla: string,
  registroId: number,
  tenantId: number
): Promise<any | null> => {
  try {
    // Mapeo de tablas a modelos de Prisma
    const modelMap: Record<string, any> = {
      Productos: db.productos,
      Ventas: db.ventas,
      Clientes: db.clientes,
      Proveedores: db.proveedores,
      Categorias: db.categorias,
      Usuarios: db.usuarios,
      Pedidos: db.pedidos,
      OrdenesCompra: db.ordenesCompra,
      InventarioAjustes: db.inventarioAjustes,
      Cajas: db.cajas,
      SesionesCaja: db.sesionesCaja,
      Series: db.series,
    };

    const model = modelMap[tabla];
    if (!model) return null;

    return await model.findFirst({
      where: { id: registroId, tenant_id: tenantId },
    });
  } catch (error) {
    console.error('[AuditMiddleware] Error al obtener estado actual:', error);
    return null;
  }
};

/**
 * Extrae el ID del registro de la URL
 * Ejemplo: /api/productos/123 → 123
 */
const extraerRegistroId = (path: string): number | undefined => {
  const match = path.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
};

/**
 * Determina la tabla afectada según la ruta
 */
const determinarTabla = (path: string): string | null => {
  for (const [route, table] of Object.entries(ROUTE_TO_TABLE_MAP)) {
    if (path.startsWith(route)) {
      return table;
    }
  }
  return null;
};

/**
 * Middleware principal de auditoría
 * Se ejecuta de forma asíncrona sin bloquear la respuesta
 */
export const auditMiddleware = (req: RequestWithAuth, res: Response, next: NextFunction) => {
  const method = req.method;
  const path = req.path;

  // Solo auditar operaciones de modificación
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return next();
  }

  // Verificar que el usuario esté autenticado
  if (!req.user || !req.tenantId) {
    return next();
  }

  const usuarioId = req.user.id;
  const tenantId = req.tenantId;
  const tabla = determinarTabla(path);

  // Si no se puede determinar la tabla, no auditar
  if (!tabla) {
    return next();
  }

  const accion = METHOD_TO_ACTION_MAP[method];
  const registroId = extraerRegistroId(path);
  const ipAddress = (req.ip || req.socket.remoteAddress) as string;
  const userAgent = req.get('user-agent');

  // Capturar datos ANTES de la operación (para PUT/DELETE)
  let datosAntes: any = null;

  if (['PUT', 'DELETE', 'PATCH'].includes(method) && registroId) {
    // Ejecutar de forma asíncrona sin bloquear
    obtenerEstadoActual(tabla, registroId, tenantId).then((estado) => {
      datosAntes = estado;
    });
  }

  // Interceptar la respuesta para capturar datos DESPUÉS
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    // Registrar auditoría de forma asíncrona (fire and forget)
    setImmediate(() => {
      const logData: auditService.AuditLogData = {
        usuarioId,
        tenantId,
        accion,
        tablaAfectada: tabla,
        registroId: registroId || body?.id,
        datosAntes,
        datosDespues: body,
        ipAddress,
        userAgent,
      };

      // Registrar sin esperar (non-blocking)
      auditService.registrarAuditoria(logData).catch((err) => {
        console.error('[AuditMiddleware] Error en registro asíncrono:', err);
      });
    });

    // Devolver la respuesta original al usuario inmediatamente
    return originalJson(body);
  };

  next();
};

/**
 * Middleware específico para auditar anulaciones
 * Usar en rutas como POST /api/ventas/:id/anular
 */
export const auditAnulacion = (tabla: string) => {
  return async (req: RequestWithAuth, res: Response, next: NextFunction) => {
    if (!req.user || !req.tenantId) {
      return next();
    }

    const registroId = parseInt(req.params.id);
    const usuarioId = req.user.id;
    const tenantId = req.tenantId;
    const ipAddress = (req.ip || req.socket.remoteAddress) as string;
    const userAgent = req.get('user-agent');

    // Obtener estado antes de anular
    const datosAntes = await obtenerEstadoActual(tabla, registroId, tenantId);

    // Interceptar respuesta
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      setImmediate(() => {
        auditService.auditarAnulacion(
          usuarioId,
          tenantId,
          tabla,
          registroId,
          datosAntes,
          ipAddress,
          userAgent
        );
      });
      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware específico para auditar ajustes de inventario
 */
export const auditAjusteInventario = async (
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !req.tenantId) {
    return next();
  }

  const usuarioId = req.user.id;
  const tenantId = req.tenantId;
  const ipAddress = (req.ip || req.socket.remoteAddress) as string;
  const userAgent = req.get('user-agent');

  // Interceptar respuesta
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    setImmediate(() => {
      auditService.auditarAjuste(
        usuarioId,
        tenantId,
        'InventarioAjustes',
        body?.id,
        req.body, // Datos del request
        body, // Respuesta del servidor
        ipAddress,
        userAgent
      );
    });
    return originalJson(body);
  };

  next();
};
