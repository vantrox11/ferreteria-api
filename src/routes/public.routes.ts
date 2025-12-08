import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
// NO usar checkAuth - estas rutas son públicas
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getCatalogoPublicoHandler,
  createCheckoutPublicoHandler,
} from '../controllers/public.controller';
import { registry, commonResponses } from '../config/openapi-registry';
import {
  ProductoCatalogoPublicoSchema,
  CatalogoPublicoQuerySchema,
  CreatePedidoPublicoSchema,
  PedidoPublicoResponseSchema,
} from '../dtos/public.dto';

const router = Router();

// Solo validar tenant - NO autenticación
router.use(checkTenant);

// ==================== GET /public/catalogo ====================
registry.registerPath({
  method: 'get',
  path: '/api/public/catalogo',
  tags: ['Público - Catálogo'],
  summary: 'Obtener catálogo de productos públicos',
  description: `Endpoint público para listar productos disponibles en la tienda web.
  
**Características:**
- No requiere autenticación (sin JWT)
- Solo expone datos seguros (precios, stock, imágenes)
- NO expone datos sensibles (costos, proveedores)
- Solo productos activos (isActive: true)
- Máximo 100 productos por request`,
  request: {
    query: CatalogoPublicoQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de productos del catálogo público',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ProductoCatalogoPublicoSchema),
          }),
        },
      },
    },
    400: {
      description: 'Tenant no identificado',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({ example: 'Tenant no identificado' }),
          }),
        },
      },
    },
  },
});

router.get(
  '/catalogo',
  validateRequest(z.object({ query: CatalogoPublicoQuerySchema })),
  getCatalogoPublicoHandler
);

// ==================== POST /public/checkout ====================
registry.registerPath({
  method: 'post',
  path: '/api/public/checkout',
  tags: ['Público - Checkout'],
  summary: 'Crear pedido desde tienda web (Guest Checkout)',
  description: `Endpoint público para crear pedidos sin autenticación.

**Flujo:**
1. **Gestión de cliente:** Busca cliente por DNI o Email
   - Si existe: Actualiza datos y usa ese ID
   - Si NO existe: Crea nuevo cliente automáticamente
2. **Validación:** Verifica stock disponible de productos
3. **Creación:** Guarda pedido con estado "pendiente"
4. **Notificación:** TODO - Enviar email de confirmación

**Datos sensibles:**
- Este endpoint NO expone costos de compra ni proveedores
- Solo trabaja con precios de venta y stock público`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreatePedidoPublicoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Pedido creado exitosamente',
      content: {
        'application/json': {
          schema: PedidoPublicoResponseSchema,
        },
      },
    },
    400: {
      description: 'Datos inválidos o tenant no identificado',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Producto no encontrado o no disponible',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({
              example: 'Producto con ID 5 no encontrado o no disponible',
            }),
          }),
        },
      },
    },
    409: {
      description: 'Stock insuficiente',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({
              example: 'Stock insuficiente para el producto "Martillo". Stock disponible: 5',
            }),
          }),
        },
      },
    },
    500: {
      description: 'Error interno del servidor',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

router.post(
  '/checkout',
  validateRequest(z.object({ body: CreatePedidoPublicoSchema })),
  createCheckoutPublicoHandler
);

export default router;
