import { type Request, type Response, type NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { findTenantBySubdominio } from '../models/tenant.model';

export interface RequestWithTenant extends Request {
    tenantId?: number;
}

/**
 * Middleware para identificar el tenant basado en el subdominio
 */
export const checkTenant = asyncHandler(
    async (req: RequestWithTenant, res: Response, next: NextFunction) => {
        // Extraer hostname considerando posible proxy (solo si TRUST_PROXY=true)
        const trustProxy = (process.env.TRUST_PROXY || 'false').toLowerCase() === 'true';
        const forwardedHost = trustProxy ? (req.headers['x-forwarded-host'] as string | undefined) : undefined;
        const hostname = forwardedHost ?? req.hostname;
        const parts = hostname.split('.');
        const subdominio = parts[0];

        if (!subdominio || subdominio === 'www' || subdominio === 'localhost') {
            res.status(400).json({ message: 'No se proporcionó un subdominio de tenant.' });
            return;
        }

        const tenant = await findTenantBySubdominio(subdominio);
        
        if (!tenant) {
            res.status(404).json({ message: 'Tenant no encontrado.' });
            return;
        }

        if (!tenant.isActive) {
            res.status(403).json({ message: 'Tenant inactivo. Completa la verificación antes de continuar.' });
            return;
        }

        req.tenantId = tenant.id;
        next();
    }
);