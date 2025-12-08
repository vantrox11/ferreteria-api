import { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { type RequestWithAuth } from '../middlewares/auth.middleware';
import * as storageService from '../services/storage.service';
import * as productoModel from '../models/producto.model';
import * as auditService from '../services/audit.service';

/**
 * POST /api/productos/:id/upload-imagen
 * Sube una imagen a Cloudinary y actualiza el campo imagen_url del producto
 * 
 * NOTA: Este endpoint requiere middleware multer para manejar multipart/form-data
 * Ejemplo de uso en la ruta:
 * 
 * import multer from 'multer';
 * const upload = multer({ storage: multer.memoryStorage() });
 * router.post('/:id/upload-imagen', upload.single('imagen'), uploadImagenHandler);
 */
export const uploadImagenHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const productoId = parseInt(req.params.id);
    const usuarioId = req.user?.id;
    const file = (req as any).file; // Archivo de multer

    // Validar que se subió un archivo
    if (!file) {
      res.status(400).json({ message: 'No se proporcionó ningún archivo' });
      return;
    }

    // Validar tipo de archivo
    if (!storageService.isValidImageType(file.mimetype)) {
      res.status(400).json({
        message: 'Tipo de archivo inválido. Solo se permiten: JPEG, PNG, WebP, GIF',
      });
      return;
    }

    // Validar tamaño (5MB máximo por defecto)
    if (!storageService.isValidImageSize(file.size)) {
      res.status(400).json({
        message: 'Archivo demasiado grande. Tamaño máximo: 5MB',
      });
      return;
    }

    // Verificar que Cloudinary esté configurado
    if (!storageService.isCloudinaryConfigured()) {
      res.status(500).json({
        message: 'Servicio de almacenamiento no configurado. Contacte al administrador.',
      });
      return;
    }

    // Verificar que el producto existe
    const producto = await productoModel.findProductoByIdAndTenant(tenantId, productoId);
    if (!producto) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }

    try {
      // Subir imagen a Cloudinary
      const imageUrl = await storageService.uploadToCloudinary(
        file.buffer,
        'productos', // Carpeta en Cloudinary
        `producto-${productoId}` // Public ID
      );

      // Si el producto ya tenía una imagen anterior, eliminarla de Cloudinary
      if (producto.imagen_url) {
        await storageService.deleteFromCloudinary(producto.imagen_url);
      }

      // Actualizar el producto con la nueva URL
      const productoActualizado = await productoModel.updateProductoByIdAndTenant(
        tenantId,
        productoId,
        { imagen_url: imageUrl }
      );

      // Registrar en auditoría
      if (usuarioId) {
        auditService.auditarActualizacion(
          usuarioId,
          tenantId,
          'Productos',
          productoId,
          { imagen_url: producto.imagen_url },
          { imagen_url: imageUrl },
          req.ip || req.socket.remoteAddress,
          req.get('user-agent')
        );
      }

      res.status(200).json({
        message: 'Imagen subida exitosamente',
        producto: {
          id: productoActualizado?.id,
          nombre: productoActualizado?.nombre,
          imagen_url: productoActualizado?.imagen_url,
          // Generar URLs de thumbnails para diferentes tamaños
          thumbnail_small: imageUrl
            ? storageService.generateThumbnailUrl(imageUrl, 100, 100)
            : null,
          thumbnail_medium: imageUrl
            ? storageService.generateThumbnailUrl(imageUrl, 300, 300)
            : null,
        },
      });
    } catch (error: any) {
      console.error('[ProductosController] Error al subir imagen:', error);
      res.status(500).json({
        message: 'Error al subir la imagen',
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/productos/:id/imagen
 * Elimina la imagen del producto (tanto de Cloudinary como de la BD)
 */
export const deleteImagenHandler = asyncHandler(
  async (req: RequestWithAuth, res: Response) => {
    const tenantId = req.tenantId!;
    const productoId = parseInt(req.params.id);
    const usuarioId = req.user?.id;

    // Verificar que el producto existe
    const producto = await productoModel.findProductoByIdAndTenant(tenantId, productoId);
    if (!producto) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }

    if (!producto.imagen_url) {
      res.status(400).json({ message: 'El producto no tiene imagen' });
      return;
    }

    try {
      // Eliminar de Cloudinary
      await storageService.deleteFromCloudinary(producto.imagen_url);

      // Actualizar BD
      await productoModel.updateProductoByIdAndTenant(tenantId, productoId, {
        imagen_url: null,
      });

      // Registrar en auditoría
      if (usuarioId) {
        auditService.auditarActualizacion(
          usuarioId,
          tenantId,
          'Productos',
          productoId,
          { imagen_url: producto.imagen_url },
          { imagen_url: null },
          req.ip || req.socket.remoteAddress,
          req.get('user-agent')
        );
      }

      res.status(200).json({
        message: 'Imagen eliminada exitosamente',
      });
    } catch (error: any) {
      console.error('[ProductosController] Error al eliminar imagen:', error);
      res.status(500).json({
        message: 'Error al eliminar la imagen',
        error: error.message,
      });
    }
  }
);
