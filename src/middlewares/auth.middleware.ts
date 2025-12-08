import { type Response, type NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { type RequestWithTenant } from './tenant.middleware';

interface CustomJwtPayload extends JwtPayload {
    tid: number;
    rol: string;
}

export interface RequestWithAuth extends RequestWithTenant {
    user?: {
        id: number;
        tenantId: number;
        rol: string;
    };
}

/**
 * Middleware de autenticación JWT con validación de tenant
 */
export const checkAuth = asyncHandler(
    async (req: RequestWithAuth, res: Response, next: NextFunction) => {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("Error: JWT_SECRET no está definido en .env");
            res.status(500).json({ message: 'Error de configuración del servidor.' });
            return;
        }

        let token;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, jwtSecret) as CustomJwtPayload;
                
                if (!decoded.sub) {
                    res.status(401).json({ message: 'No autorizado, token inválido (sin subject).' });
                    return;
                }
                
                // Validación crítica: el token debe pertenecer al mismo tenant
                if (decoded.tid !== req.tenantId) {
                    res.status(403).json({ message: 'Prohibido. Token no válido para este tenant.' });
                    return;
                }
                
                req.user = {
                    id: parseInt(decoded.sub, 10),
                    tenantId: decoded.tid,
                    rol: decoded.rol
                };
                
                if (isNaN(req.user.id)) {
                    res.status(401).json({ message: 'No autorizado, token inválido (subject malformado).' });
                    return;
                }
                
                next();
            } catch (error) {
                res.status(401).json({ message: 'No autorizado, token inválido.' });
                return;
            }
        }
        
        if (!token) {
            res.status(401).json({ message: 'No autorizado, no se encontró token.' });
        }
    }
);

/**
 * Middleware de autorización por rol.
 * Uso: router.post('/ruta', checkTenant, checkAuth, requireRoles(['admin','empleado']), handler)
 */
export const requireRoles = (roles: string[]) => asyncHandler(
  async (req: RequestWithAuth, res: Response, next: NextFunction) => {
    const userRol = req.user?.rol;
    if (!userRol) {
      res.status(401).json({ message: 'No autorizado. Usuario no autenticado.' });
      return;
    }
    if (!roles.includes(userRol)) {
      res.status(403).json({ message: 'Prohibido. Rol insuficiente para acceder a este recurso.' });
      return;
    }
    next();
  }
);
