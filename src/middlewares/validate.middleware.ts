import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validateRequest = (schema: z.ZodTypeAny) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validamos body, query y params contra el esquema Zod
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('❌ Error de validación Zod:');
        console.error('Body recibido:', JSON.stringify(req.body, null, 2));
        console.error('Errores:', error.issues);
        
        // Formato estándar de error para el frontend
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.').replace('body.', '').replace('query.', '').replace('params.', ''),
            message: e.message,
            path: e.path,
          })),
        });
      }
      return res.status(500).json({ message: 'Error interno de validación' });
    }
  };