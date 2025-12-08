/**
 * Servicio de Almacenamiento en Cloud (Cloudinary)
 * Implementa la "Opción B" (upload vía backend) del documento de especificación
 * Sección 6 del DocumentodeEspecificacionTecnica.md
 * 
 * NOTA: Este archivo requiere instalación de dependencias:
 * npm install cloudinary multer @types/multer
 * 
 * Y configuración de variables de entorno en .env:
 * CLOUDINARY_CLOUD_NAME=tu_cloud_name
 * CLOUDINARY_API_KEY=tu_api_key
 * CLOUDINARY_API_SECRET=tu_api_secret
 */

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube un archivo a Cloudinary
 * @param buffer Buffer del archivo
 * @param folder Carpeta en Cloudinary (ej: "productos")
 * @param publicId ID público opcional (ej: "producto-123")
 * @returns URL pública del archivo subido
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = 'productos',
  publicId?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Máximo 1200x1200
        { quality: 'auto:good' }, // Optimización automática
        { fetch_format: 'auto' }, // Formato automático (webp si el navegador lo soporta)
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('[StorageService] Error al subir a Cloudinary:', error);
          return reject(new Error('Error al subir imagen a Cloudinary'));
        }
        if (!result) {
          return reject(new Error('No se recibió respuesta de Cloudinary'));
        }
        resolve(result.secure_url);
      }
    );

    // Convertir Buffer a Stream y subirlo
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Elimina un archivo de Cloudinary
 * @param imageUrl URL pública de la imagen
 * @returns true si se eliminó correctamente
 */
export const deleteFromCloudinary = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extraer el public_id de la URL
    // Ejemplo URL: https://res.cloudinary.com/demo/image/upload/v1234567890/productos/producto-123.jpg
    // Public ID: productos/producto-123
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex((part) => part === 'upload');
    if (uploadIndex === -1) {
      console.error('[StorageService] URL de Cloudinary inválida:', imageUrl);
      return false;
    }

    // Construir public_id (folder + filename sin extensión)
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/'); // Saltar "upload" y versión
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, ''); // Quitar extensión

    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('[StorageService] Error al eliminar de Cloudinary:', error);
    return false;
  }
};

/**
 * Genera URL de transformación para thumbnail
 * @param originalUrl URL original de Cloudinary
 * @param width Ancho del thumbnail
 * @param height Alto del thumbnail
 * @returns URL del thumbnail
 */
export const generateThumbnailUrl = (
  originalUrl: string,
  width: number = 200,
  height: number = 200
): string => {
  // Insertar transformación en la URL
  // De: https://res.cloudinary.com/demo/image/upload/v1234567890/productos/producto-123.jpg
  // A: https://res.cloudinary.com/demo/image/upload/c_fill,h_200,w_200/v1234567890/productos/producto-123.jpg
  return originalUrl.replace('/upload/', `/upload/c_fill,h_${height},w_${width}/`);
};

/**
 * Valida que el archivo sea una imagen válida
 * @param mimetype MIME type del archivo
 * @returns true si es imagen válida
 */
export const isValidImageType = (mimetype: string): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(mimetype);
};

/**
 * Valida el tamaño del archivo
 * @param size Tamaño en bytes
 * @param maxSizeMB Tamaño máximo en MB (por defecto 5MB)
 * @returns true si el tamaño es válido
 */
export const isValidImageSize = (size: number, maxSizeMB: number = 5): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

/**
 * Verifica si Cloudinary está configurado correctamente
 */
export const isCloudinaryConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};
