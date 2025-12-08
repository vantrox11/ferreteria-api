import { Router } from 'express';
import { z } from 'zod';
import { checkTenant } from '../middlewares/tenant.middleware';
import { checkAuth, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
    getProductosHandler,
    createProductoHandler,
    getProductoByIdHandler,
    updateProductoHandler,
    desactivarProductoHandler
} from '../controllers/productos.controller';
import {
    uploadImagenHandler,
    deleteImagenHandler
} from '../controllers/imagen-producto.controller';
import multer from 'multer';
import { registry, commonResponses, createPaginatedResponseSchema, PaginationQuerySchema, SuccessResponseSchema } from '../config/openapi-registry';
import { 
  ProductoResponseSchema,
  CreateProductoSchema,
  UpdateProductoSchema
} from '../dtos/producto.dto';
import { IdParamSchema } from '../dtos/common.dto';

const upload = multer({ 
    storage: multer.memoryStorage(), 
    limits: { fileSize: 5 * 1024 * 1024 }
});

const router = Router();

router.use(checkTenant);
router.use(checkAuth);

// ============================================================================
// REGISTRO DE ENDPOINTS EN OPENAPI
// ============================================================================

const ProductosPaginatedSchema = createPaginatedResponseSchema(
  ProductoResponseSchema,
  'ProductosPaginated'
);

/**
 * Schema para query params de productos (paginación + búsqueda)
 */
const ProductosQuerySchema = PaginationQuerySchema.extend({
  q: z.string().optional().openapi({
    description: 'Término de búsqueda (nombre, código, SKU)',
    example: 'martillo',
  }),
});

registry.registerPath({
  method: 'get',
  path: '/api/productos',
  tags: ['Productos'],
  summary: 'Listar productos con paginación',
  description: 'Obtiene productos del tenant con paginación y búsqueda. Solo retorna productos activos (isActive: true).',
  security: [{ bearerAuth: [] }],
  request: {
    query: ProductosQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista de productos',
      content: {
        'application/json': {
          schema: ProductosPaginatedSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/productos/{id}',
  tags: ['Productos'],
  summary: 'Obtener producto por ID',
  description: 'Obtiene los detalles completos de un producto específico del tenant.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalle del producto',
      content: {
        'application/json': {
          schema: ProductoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/productos',
  tags: ['Productos'],
  summary: 'Crear producto (Solo Admin)',
  description: 'Crea un nuevo producto. El sistema calcula automáticamente el precio_base realizando cálculo inverso desde precio_venta. Ejemplo: precio_venta=100 (CON IGV) → precio_base=84.75 (SIN IGV).',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProductoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Producto creado exitosamente',
      content: {
        'application/json': {
          schema: ProductoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/productos/{id}',
  tags: ['Productos'],
  summary: 'Actualizar producto (Solo Admin)',
  description: 'Actualiza un producto existente. El precio_base se recalcula automáticamente si se modifica precio_venta.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateProductoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Producto actualizado exitosamente',
      content: {
        'application/json': {
          schema: ProductoResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/productos/{id}/desactivar',
  tags: ['Productos'],
  summary: 'Desactivar producto (Soft Delete - Solo Admin)',
  description: 'Marca el producto como inactivo (isActive: false). El producto no se elimina de la base de datos.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Producto desactivado exitosamente',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/productos/{id}/upload-imagen',
  tags: ['Productos'],
  summary: 'Subir imagen de producto (Solo Admin)',
  description: 'Sube una imagen a Cloudinary y actualiza el campo imagen_url del producto. Límite: 5 MB. Formatos: JPG, PNG, WEBP.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  requestBody: {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: {
            imagen: {
              type: 'string',
              format: 'binary',
              description: 'Archivo de imagen (JPG, PNG, WEBP, máx 5 MB)',
            },
          },
          required: ['imagen'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Imagen subida exitosamente',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            imagen_url: z.string(),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/productos/{id}/imagen',
  tags: ['Productos'],
  summary: 'Eliminar imagen de producto (Solo Admin)',
  description: 'Elimina la imagen de Cloudinary y limpia el campo imagen_url del producto.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Imagen eliminada exitosamente',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// RUTAS CON VALIDACIÓN AUTOMÁTICA
// ============================================================================

router.get(
  '/',
  validateRequest(z.object({ query: ProductosQuerySchema })),
  getProductosHandler
);

router.get(
  '/:id',
  validateRequest(z.object({ params: IdParamSchema })),
  getProductoByIdHandler
);

router.post(
  '/',
  requireRoles(['admin']),
  validateRequest(z.object({ body: CreateProductoSchema })),
  createProductoHandler
);

router.put(
  '/:id',
  requireRoles(['admin']),
  validateRequest(z.object({ 
    params: IdParamSchema,
    body: UpdateProductoSchema 
  })),
  updateProductoHandler
);

router.patch(
  '/:id/desactivar',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  desactivarProductoHandler
);

router.post(
  '/:id/upload-imagen',
  requireRoles(['admin']),
  upload.single('imagen'),
  validateRequest(z.object({ params: IdParamSchema })),
  uploadImagenHandler
);

router.delete(
  '/:id/imagen',
  requireRoles(['admin']),
  validateRequest(z.object({ params: IdParamSchema })),
  deleteImagenHandler
);

export default router;
