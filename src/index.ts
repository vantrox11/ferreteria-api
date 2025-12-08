import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './config/db';
import authRoutes from './routes/auth.routes';
import publicRoutes from './routes/public.routes'; // Rutas públicas (sin JWT)
import productosRoutes from './routes/productos.routes';
import categoriasRoutes from './routes/categorias.routes';
import clientesRoutes from './routes/clientes.routes';
import proveedoresRoutes from './routes/proveedores.routes';
import pedidosRoutes from './routes/pedidos.routes';
import ventasRoutes from './routes/ventas.routes';
import inventarioRoutes from './routes/inventario.routes';
import ordenesCompraRoutes from './routes/ordenes-compra.routes';
import tenantRoutes from './routes/tenant.routes';
import usuariosRoutes from './routes/usuarios.routes';
import reportesRoutes from './routes/reportes.routes';
import dashboardRoutes from './routes/dashboard.routes';
// Hito 3: Control de Caja y SUNAT
import cajasRoutes from './routes/cajas.routes';
import sesionesCajaRoutes from './routes/sesiones-caja.routes';
import movimientosCajaRoutes from './routes/movimientos-caja.routes';
import seriesRoutes from './routes/series.routes';
// Hito 4: Auditoría y Storage
import auditoriaRoutes from './routes/auditoria.routes';
// Fase 1: Módulo de Cobranzas, Guías y Notas de Crédito
import cobranzasRoutes from './routes/cobranzas.routes';
import guiasRemisionRoutes from './routes/guias-remision.routes';
import notasCreditoRoutes from './routes/notas-credito.routes';
import pagosRoutes from './routes/pagos.routes';
import { auditMiddleware } from './middlewares/audit.middleware';
// Tablas Maestras Normalizadas
import unidadesMedidaRoutes from './routes/unidades-medida.routes';
import marcasRoutes from './routes/marcas.routes';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3001');

// Configuración de middlewares
// CORS dinámico por entorno — soporta lista y comodín *.localhost:5173
const corsOriginsEnv = process.env.CORS_ORIGINS || 'http://localhost:5173';
const allowedOrigins = corsOriginsEnv.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // permitir herramientas como Postman

    const isAllowed = allowedOrigins.some((allowed) => {
      // 1. Coincidencia exacta
      if (allowed === origin) return true;

      // 2. Soporte para comodines (ej: http://*.localhost:3001)
      if (allowed.includes('*')) {
        // Convierte el patrón del .env (ej: http://*.localhost:3001) en una Expresión Regular
        // Escapamos los puntos (.) y reemplazamos el asterisco (*) por "cualquier texto"
        const pattern = allowed
          .replace(/\./g, '\\.')
          .replace(/\*/g, '[a-zA-Z0-9-]+');

        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }

      return false;
    });

    if (isAllowed) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hito 4: Audit middleware (aplica a POST/PUT/DELETE/PATCH después del healthcheck)
app.use(auditMiddleware);

// Cargar el OpenAPI generado desde Zod schemas
const openapiGeneratedPath = path.join(__dirname, '../openapi-generated.json');
if (!fs.existsSync(openapiGeneratedPath)) {
  throw new Error('❌ OpenAPI document not found. Run: npm run generate:openapi');
}
const openapiGenerated = JSON.parse(fs.readFileSync(openapiGeneratedPath, 'utf-8'));

// Esto fuerza a Swagger a usar la URL actual (f123.localhost...) en lugar de la fija
openapiGenerated.servers = [{ url: '/', description: 'Servidor Actual' }];
// --------------------------


// Swagger UI - Documentación API (usando el OpenAPI generado)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiGenerated, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Ferretería API - Documentación Schema-First',
}));

// Endpoint para obtener el JSON de OpenAPI generado
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiGenerated);
});

// Healthcheck endpoint
app.get('/api/healthcheck', async (req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      message: "Servidor API funcionando y CONECTADO a la Base de Datos!"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error al conectar con la Base de Datos.",
    });
  }
});

// Rutas de la API
app.use('/api/auth', authRoutes);
// Rutas públicas (sin autenticación JWT) - deben ir ANTES de las protegidas
app.use('/api/public', publicRoutes);
// Rutas protegidas (requieren JWT)
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/compras', ordenesCompraRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Tablas Maestras Normalizadas
app.use('/api/unidades-medida', unidadesMedidaRoutes);
app.use('/api/marcas', marcasRoutes);
// Hito 3: Control de Caja y SUNAT
app.use('/api/cajas', cajasRoutes);
app.use('/api/sesiones-caja', sesionesCajaRoutes);
app.use('/api/movimientos-caja', movimientosCajaRoutes);
app.use('/api/series', seriesRoutes);
// Hito 4: Auditoría
app.use('/api/auditoria', auditoriaRoutes);
// Fase 1: Cobranzas, Guías de Remisión y Notas de Crédito
app.use('/api/cobranzas', cobranzasRoutes);
app.use('/api/guias-remision', guiasRemisionRoutes);
app.use('/api/notas-credito', notasCreditoRoutes);
app.use('/api/cuentas-por-cobrar', pagosRoutes);

// Global Error Handler - Captura errores no manejados
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: any) => {
  console.error('❌ [ERROR GLOBAL]', err.message);
  // En producción, no exponer stack trace
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Error interno del servidor' });
  } else {
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// Iniciar servidor
try {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
  });
} catch (error: any) {
  console.error(`Error al iniciar el servidor: ${error.message}`);
}
