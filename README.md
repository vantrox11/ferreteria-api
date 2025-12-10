# Ferretería API

API REST para gestión de ferretería con soporte multi-tenant.

## Características

- 🏢 **Multi-tenancy** por subdominio
- 🔐 **Autenticación JWT**
- 📦 **Gestión de inventario** con Kardex
- 💰 **Control de caja y ventas** (POS)
- 🧾 **Facturación electrónica** (integración SUNAT)
- 📊 **Reportes y dashboard**
- 🔍 **Auditoría completa**

## Requisitos

- Node.js 18+
- MySQL 8+
- npm o yarn

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones
npm run db:migrate

# Iniciar en desarrollo
npm run dev
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Compilar para producción |
| `npm run start` | Iniciar servidor de producción |
| `npm run db:migrate` | Ejecutar migraciones de Prisma |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run generate:openapi` | Generar especificación OpenAPI |
| `npm run audit:api` | Auditar consistencia API vs OpenAPI |
| `npm test` | Ejecutar tests |

## Documentación API

La documentación OpenAPI se genera automáticamente en `openapi-generated.json`.

---

## ⚠️ Configuración de Producción

### IMPORTANTE: Configurar el Proxy Inverso

Si usas un proxy inverso (Nginx, Apache, Traefik, etc.), debes **sobrescribir el header `X-Forwarded-Host` con `$host`** para que la detección de tenant por subdominio funcione correctamente.

#### Ejemplo Nginx:

```nginx
server {
    listen 80;
    server_name *.ferreteria.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # ⚠️ CRÍTICO para multi-tenancy:
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

#### Ejemplo Apache:

```apache
<VirtualHost *:80>
    ServerName *.ferreteria.com
    
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Host "%{HTTP_HOST}s"
    
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
</VirtualHost>
```

Sin esta configuración, la API no podrá detectar el subdominio del tenant correctamente.

---

## Estructura del Proyecto

```
src/
├── config/          # Configuración (DB, OpenAPI registry)
├── controllers/     # Handlers de rutas
├── dtos/            # Schemas Zod para validación
├── middlewares/     # Auth, tenant, validación
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
└── utils/           # Utilidades y helpers
```

## Licencia

Privado - Todos los derechos reservados.
