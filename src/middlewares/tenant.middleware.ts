import { type Request, type Response, type NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { findTenantBySubdominio } from '../services/tenants.service';
import { runWithTenant } from '../config/tenant-context';

export interface RequestWithTenant extends Request {
    tenantId?: number;
}

/**
 * Middleware para identificar el tenant basado en el subdominio
 * 
 * Características:
 * - Detección robusta de hostname con soporte para X-Forwarded-Host
 * - Fallback seguro con X-Tenant-ID (solo en desarrollo o con ADMIN_SECRET)
 * - Integración con AsyncLocalStorage para contexto de tenant global
 */
export const checkTenant = asyncHandler(
    async (req: RequestWithTenant, res: Response, next: NextFunction) => {
        const trustProxy = (process.env.TRUST_PROXY || 'false').toLowerCase() === 'true';

        // 1. Detección Robusta de Hostname
        const rawForwardedHost = trustProxy ? (req.headers['x-forwarded-host'] as string | undefined) : undefined;
        // Tomamos el primer host de la lista (puede haber múltiples) y eliminamos el puerto
        const forwardedHost = rawForwardedHost?.split(',')[0]?.trim()?.split(':')[0];
        const hostname = forwardedHost ?? req.hostname.split(':')[0];

        let subdominio = hostname.split('.')[0];

        // 2. Fallback Seguro X-Tenant-ID (Solo Dev o Clientes Internos con secreto)
        const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
        const adminSecret = req.headers['x-admin-secret'] as string | undefined;
        const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

        // Solo aceptamos el header si estamos en DEV o si se provee un secreto de admin correcto
        const canUseHeader = isDev || (process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET);

        if (subdominio === 'localhost' || subdominio === 'www' || !subdominio) {
            if (canUseHeader && headerTenantId) {
                // Permitimos sobreescribir usando el subdominio del header
                subdominio = headerTenantId;
            } else {
                res.status(400).json({ message: 'No se detectó un subdominio de tenant válido.' });
                return;
            }
        }

        const tenant = await findTenantBySubdominio(subdominio);

        if (!tenant) {
            res.status(404).json({ message: `Tenant '${subdominio}' no encontrado.` });
            return;
        }

        if (!tenant.isActive) {
            res.status(403).json({ message: 'Tenant inactivo. Contacte a soporte.' });
            return;
        }

        // Inyectar en Request (compatibilidad legacy con código existente)
        req.tenantId = tenant.id;

        // 🔥 ACTIVAR CONTEXTO: Todo lo que ocurra después de next() tendrá acceso al tenant
        runWithTenant(tenant.id, () => {
            next();
        });
    }
);

