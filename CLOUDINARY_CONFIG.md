# Configuración de Variables de Entorno - Hito 4

## 📝 Instrucciones

Agregar las siguientes variables al archivo `.env` en la raíz del proyecto:

```env
# ============================================
# HITO 4: CLOUDINARY STORAGE CONFIGURATION
# ============================================

# 1. Crear cuenta gratuita en https://cloudinary.com
# 2. Ir al Dashboard: https://console.cloudinary.com/console
# 3. Copiar las credenciales:

CLOUDINARY_CLOUD_NAME=tu_cloud_name_aqui
CLOUDINARY_API_KEY=tu_api_key_aqui
CLOUDINARY_API_SECRET=tu_api_secret_aqui

# Ejemplo (ESTOS NO FUNCIONARÁN - usar tus propias credenciales):
# CLOUDINARY_CLOUD_NAME=ferreteria-demo
# CLOUDINARY_API_KEY=123456789012345
# CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

## ✅ Verificación

Después de agregar las variables, verificar que la configuración funcione:

### Método 1: Endpoint de Healthcheck (Agregar en futuro)
```bash
GET http://localhost:3000/api/healthcheck/cloudinary
```

### Método 2: Intentar Upload
```bash
# Si las credenciales son incorrectas, obtendrás error 500
# Si están correctas, el upload será exitoso

curl -X POST \
  -H "Authorization: Bearer <tu_token>" \
  -H "X-Tenant-ID: tenant1" \
  -F "imagen=@test-image.jpg" \
  http://localhost:3000/api/productos/1/upload-imagen
```

## 🔐 Seguridad

⚠️ **IMPORTANTE**:
- **NUNCA** subir el archivo `.env` a Git
- Verificar que `.env` esté en `.gitignore`
- Usar diferentes credenciales para desarrollo/producción
- Rotar las API secrets periódicamente

## 📦 Plan Gratuito de Cloudinary

El plan gratuito incluye:
- ✅ 25 créditos/mes (suficiente para ~25,000 transformaciones)
- ✅ 25 GB de almacenamiento
- ✅ 25 GB de ancho de banda/mes
- ✅ Transformaciones automáticas (resize, crop, format)
- ✅ CDN global incluido

**Para producción con alto tráfico**: Considerar upgrade a plan pago.

## 🔄 Alternativa: Amazon S3

Si prefieres usar S3 en lugar de Cloudinary, modificar `src/services/storage.service.ts`:

```typescript
// npm install aws-sdk @aws-sdk/client-s3

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export async function uploadToS3(buffer: Buffer, key: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  });
  
  await s3Client.send(command);
  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

Variables de entorno para S3:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_S3_BUCKET=ferreteria-imagenes
```

---

**Próximo Paso**: Después de configurar .env, reiniciar el servidor con `npm run dev`
