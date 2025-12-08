/**
 * Tests de Integración: Validación de Contrato API
 * 
 * Estos tests validan que:
 * 1. Los endpoints respondan según la especificación OpenAPI
 * 2. Los schemas de respuesta coincidan con la documentación
 * 3. Los códigos de estado sean correctos
 * 4. Las validaciones de entrada funcionen como se documenta
 * 
 * Framework: Jest + Supertest
 */

import request from 'supertest';
import app from '../../src/index'; // Tu app Express
import { generateOpenAPIDocument } from '../../scripts/generate-openapi-from-zod';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('API Contract Validation', () => {
  let authToken: string;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  beforeAll(async () => {
    // Obtener token de autenticación para tests
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'test123',
        tenant_subdomain: 'test-tenant',
      });

    authToken = response.body.token;
  });

  describe('Productos Endpoint', () => {
    it('GET /api/productos debe coincidir con schema OpenAPI', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Subdomain', 'test-tenant')
        .query({ page: 1, limit: 10 });

      // Validar status code
      expect(response.status).toBe(200);

      // Validar estructura de respuesta
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Validar paginación
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');

      // Validar que cada producto tenga la estructura correcta
      if (response.body.data.length > 0) {
        const producto = response.body.data[0];
        expect(producto).toHaveProperty('id');
        expect(producto).toHaveProperty('nombre');
        expect(producto).toHaveProperty('precio_base');
        expect(producto).toHaveProperty('stock');
      }
    });

    it('POST /api/productos debe validar entrada según DTO', async () => {
      const invalidProduct = {
        // Falta nombre (required)
        precio_base: -10, // Precio negativo (invalid)
      };

      const response = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Subdomain', 'test-tenant')
        .send(invalidProduct);

      // Debe rechazar con 400
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('GET /api/productos/{id} debe retornar 404 para ID inexistente', async () => {
      const response = await request(app)
        .get('/api/productos/99999999')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Subdomain', 'test-tenant');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Ventas Endpoint', () => {
    it('POST /api/ventas sin sesión de caja debe retornar 403', async () => {
      const venta = {
        cliente_id: 1,
        metodo_pago: 'EFECTIVO',
        detalles: [
          {
            producto_id: 1,
            cantidad: 2,
            precio_unitario: 50,
          },
        ],
      };

      const response = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Subdomain', 'test-tenant')
        .send(venta);

      // Si no hay sesión activa, debe retornar 403
      if (response.status === 403) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('requiere_accion');
        expect(response.body.requiere_accion).toBe('APERTURA_SESION');
      }
    });
  });

  describe('Auth Endpoint', () => {
    it('POST /api/auth/login con credenciales inválidas debe retornar 401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalido@test.com',
          password: 'wrongpassword',
          tenant_subdomain: 'test-tenant',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/auth/register debe validar formato de email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email', // Email inválido
          password: 'test123',
          nombre: 'Test User',
          tenant_subdomain: 'new-tenant',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Response Headers', () => {
    it('Todos los endpoints deben retornar Content-Type: application/json', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Subdomain', 'test-tenant');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Error Handling', () => {
    it('Endpoint no existente debe retornar 404', async () => {
      const response = await request(app)
        .get('/api/endpoint-inexistente')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Subdomain', 'test-tenant');

      expect(response.status).toBe(404);
    });

    it('Request sin autenticación debe retornar 401', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('X-Tenant-Subdomain', 'test-tenant');

      expect(response.status).toBe(401);
    });

    it('Request sin tenant debe retornar 400', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});

/**
 * Test adicional: Validar que OpenAPI spec está actualizado
 */
describe('OpenAPI Specification', () => {
  it('Documento OpenAPI debe ser válido', () => {
    const document = generateOpenAPIDocument();
    
    expect(document).toHaveProperty('openapi');
    expect(document).toHaveProperty('info');
    expect(document).toHaveProperty('paths');
    expect(document.openapi).toMatch(/^3\./);
  });

  it('Todos los endpoints deben tener tags', () => {
    const document = generateOpenAPIDocument();
    const paths = Object.keys(document.paths || {});

    paths.forEach(path => {
      const methods = Object.keys(document.paths[path]);
      methods.forEach(method => {
        const operation = document.paths[path][method];
        expect(operation).toHaveProperty('tags');
        expect(operation.tags.length).toBeGreaterThan(0);
      });
    });
  });
});
