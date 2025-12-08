import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry, createPaginatedResponseSchema, PaginationQuerySchema } from '../config/openapi-registry';
import { cantidadDecimalSchema, montoDecimalSchema } from './common.dto';

extendZodWithOpenApi(z);

/**
 * Enum de Motivos de Traslado según SUNAT
 */
export const MotivoTrasladoEnum = z.enum([
  'VENTA',
  'COMPRA',
  'TRASLADO_ENTRE_ESTABLECIMIENTOS',
  'OTROS',
]);

/**
 * Enum de Estados SUNAT (reutilizado)
 */
export const EstadoSunatEnum = z.enum([
  'PENDIENTE',
  'ACEPTADO',
  'RECHAZADO',
  'OBSERVADO',
]);

/**
 * Enum de Modalidad de Transporte
 */
export const ModalidadTransporteEnum = z.enum(['PRIVADO', 'PUBLICO']);

/**
 * Schema para detalle de Guía de Remisión
 */
const DetalleGuiaRemisionSchema = z.object({
  producto_id: z.number().int().positive('ID de producto requerido').openapi({
    description: 'ID del producto a trasladar',
    example: 1,
  }),
  cantidad: cantidadDecimalSchema.openapi({
    description: 'Cantidad del producto a trasladar (máximo 3 decimales)',
    example: 10.0,
  }),
});

/**
 * DTO para crear una Guía de Remisión
 */
export const CreateGuiaRemisionSchema = registry.register(
  'CreateGuiaRemision',
  z.object({
    venta_id: z.number().int().positive().optional().openapi({
      description: 'ID de la venta asociada (opcional, puede ser traslado sin venta)',
      example: 123,
    }),
    motivo_traslado: MotivoTrasladoEnum.openapi({
      description: 'Motivo del traslado según catálogo SUNAT',
      example: 'VENTA',
    }),
    descripcion_motivo: z.string().max(500).optional().openapi({
      description: 'Descripción adicional del motivo',
      example: 'Entrega de mercadería vendida al cliente',
    }),
    peso_bruto_total: montoDecimalSchema.openapi({
      description: 'Peso total de la carga en kilogramos',
      example: 150.50,
    }),
    numero_bultos: z.number().int().positive('Debe indicar al menos 1 bulto').openapi({
      description: 'Número de paquetes o bultos',
      example: 5,
    }),
    
    // Punto de partida
    direccion_partida: z.string().min(10, 'Dirección de partida debe tener al menos 10 caracteres').max(500).openapi({
      description: 'Dirección completa del punto de partida',
      example: 'Av. Los Pinos 123, Lima, Lima',
    }),
    ubigeo_partida: z.string().min(5).max(6).optional().transform(val => val ? val.padStart(6, '0') : val).openapi({
      description: 'Código de ubigeo SUNAT del punto de partida (5-6 dígitos, se completa con ceros)',
      example: '150101',
    }),
    
    // Punto de llegada
    direccion_llegada: z.string().min(10, 'Dirección de llegada debe tener al menos 10 caracteres').max(500).openapi({
      description: 'Dirección completa del punto de llegada',
      example: 'Jr. Las Flores 456, Callao, Callao',
    }),
    ubigeo_llegada: z.string().min(5).max(6).optional().transform(val => val ? val.padStart(6, '0') : val).openapi({
      description: 'Código de ubigeo SUNAT del punto de llegada (5-6 dígitos, se completa con ceros)',
      example: '070101',
    }),
    
    // Datos del transporte
    modalidad_transporte: ModalidadTransporteEnum.default('PRIVADO').openapi({
      description: 'Modalidad: PRIVADO (transporte propio) o PUBLICO (tercerizado)',
      example: 'PRIVADO',
    }),
    
    // Si es transporte PÚBLICO
    ruc_transportista: z.string().length(11).optional().openapi({
      description: 'RUC de la empresa transportista (solo si es PUBLICO)',
      example: '20123456789',
    }),
    razon_social_transportista: z.string().max(200).optional().openapi({
      description: 'Razón social de la empresa transportista',
      example: 'TRANSPORTES RÁPIDOS S.A.C.',
    }),
    
    // Si es transporte PRIVADO
    placa_vehiculo: z.string().max(10).optional().openapi({
      description: 'Placa del vehículo (obligatorio si es PRIVADO)',
      example: 'ABC-123',
    }),
    licencia_conducir: z.string().max(20).optional().openapi({
      description: 'Número de licencia del conductor',
      example: 'Q12345678',
    }),
    nombre_conductor: z.string().max(200).optional().openapi({
      description: 'Nombre completo del conductor',
      example: 'Juan Pérez García',
    }),
    
    // Fecha del traslado
    fecha_inicio_traslado: z.string().datetime().openapi({
      description: 'Fecha y hora programada de inicio del traslado',
      example: '2025-12-02T08:00:00Z',
    }),
    
    // Detalles de productos
    detalles: z.array(DetalleGuiaRemisionSchema).min(1, 'Debe incluir al menos un producto').openapi({
      description: 'Detalles de los productos a trasladar',
    }),
  }).refine(
    (data) => {
      // Validar que si es PUBLICO tenga RUC y razón social
      if (data.modalidad_transporte === 'PUBLICO') {
        return !!data.ruc_transportista && !!data.razon_social_transportista;
      }
      return true;
    },
    {
      message: 'Si la modalidad es PUBLICO, debe proporcionar RUC y razón social del transportista',
      path: ['ruc_transportista'],
    }
  ).refine(
    (data) => {
      // Validar que si es PRIVADO tenga placa del vehículo
      if (data.modalidad_transporte === 'PRIVADO') {
        return !!data.placa_vehiculo;
      }
      return true;
    },
    {
      message: 'Si la modalidad es PRIVADO, debe proporcionar la placa del vehículo',
      path: ['placa_vehiculo'],
    }
  )
);
export type CreateGuiaRemisionDTO = z.infer<typeof CreateGuiaRemisionSchema>;

/**
 * Schema de respuesta para detalle de Guía de Remisión
 */
export const GuiaRemisionDetalleResponseSchema = registry.register(
  'GuiaRemisionDetalle',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    producto_id: z.number().int().openapi({ example: 1 }),
    cantidad: z.number().openapi({ example: 10.0 }),
    producto: z.object({
      id: z.number().int(),
      nombre: z.string(),
      sku: z.string().nullable(),
    }).optional().openapi({
      description: 'Datos del producto',
    }),
  })
);
export type GuiaRemisionDetalleResponseDTO = z.infer<typeof GuiaRemisionDetalleResponseSchema>;

/**
 * Schema de respuesta para Guía de Remisión
 */
export const GuiaRemisionResponseSchema = registry.register(
  'GuiaRemision',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    serie: z.object({
      id: z.number().int(),
      codigo: z.string(),
      tipo_comprobante: z.string(),
    }).nullable().optional().openapi({
      description: 'Datos de la serie SUNAT (expandido)',
    }),
    numero: z.number().int().openapi({ 
      description: 'Número correlativo',
      example: 1 
    }),
    motivo_traslado: MotivoTrasladoEnum.openapi({ example: 'VENTA' }),
    descripcion_motivo: z.string().nullable().openapi({ 
      example: 'Entrega de mercadería vendida' 
    }),
    peso_bruto_total: z.number().openapi({ 
      description: 'Peso en KG',
      example: 150.50 
    }),
    numero_bultos: z.number().int().openapi({ example: 5 }),
    direccion_partida: z.string().openapi({ 
      example: 'Av. Los Pinos 123, Lima' 
    }),
    ubigeo_partida: z.string().nullable().openapi({ example: '150101' }),
    direccion_llegada: z.string().openapi({ 
      example: 'Jr. Las Flores 456, Callao' 
    }),
    ubigeo_llegada: z.string().nullable().openapi({ example: '070101' }),
    modalidad_transporte: z.string().openapi({ example: 'PRIVADO' }),
    ruc_transportista: z.string().nullable().openapi({ example: '20123456789' }),
    razon_social_transportista: z.string().nullable().openapi({ 
      example: 'TRANSPORTES RÁPIDOS S.A.C.' 
    }),
    placa_vehiculo: z.string().nullable().openapi({ example: 'ABC-123' }),
    licencia_conducir: z.string().nullable().openapi({ example: 'Q12345678' }),
    nombre_conductor: z.string().nullable().openapi({ 
      example: 'Juan Pérez García' 
    }),
    estado_sunat: EstadoSunatEnum.nullable().openapi({ example: 'ACEPTADO' }),
    xml_url: z.string().nullable().openapi({ 
      example: 'https://storage.example.com/xml/T001-1.xml' 
    }),
    cdr_url: z.string().nullable().openapi({ 
      example: 'https://storage.example.com/cdr/R-T001-1.xml' 
    }),
    hash_cpe: z.string().nullable().openapi({ example: 'xyz789hash' }),
    fecha_emision: z.string().datetime().openapi({ 
      example: '2025-12-01T10:00:00Z' 
    }),
    fecha_inicio_traslado: z.string().datetime().openapi({ 
      example: '2025-12-02T08:00:00Z' 
    }),
    created_at: z.string().datetime().openapi({ 
      example: '2025-12-01T10:00:00Z' 
    }),
    tenant_id: z.number().int().openapi({ example: 1 }),
    venta_id: z.number().int().nullable().openapi({ 
      description: 'ID de la venta asociada (si aplica)',
      example: 123 
    }),
    venta: z.object({
      id: z.number().int(),
      total: z.number(),
      numero_comprobante: z.number().int().nullable(),
      serie: z.object({
        codigo: z.string(),
        tipo_comprobante: z.string(),
      }).nullable().optional(),
    }).nullable().optional().openapi({
      description: 'Datos de la venta asociada',
    }),
    usuario_id: z.number().int().nullable().openapi({ example: 1 }),
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string().nullable(),
      email: z.string(),
    }).nullable().optional().openapi({
      description: 'Datos del usuario emisor',
    }),
    detalles: z.array(GuiaRemisionDetalleResponseSchema).optional().openapi({
      description: 'Detalles de productos a trasladar',
    }),
  })
);
export type GuiaRemisionResponseDTO = z.infer<typeof GuiaRemisionResponseSchema>;

/**
 * Query params para listar Guías de Remisión
 */
export const ListGuiasRemisionQuerySchema = registry.register(
  'ListGuiasRemisionQuery',
  PaginationQuerySchema.extend({
    q: z.string().optional().openapi({
      description: 'Búsqueda por serie/número',
      example: 'T001',
    }),
    venta_id: z.coerce.number().int().positive().optional().openapi({
      description: 'Filtrar por ID de venta',
      example: 123,
    }),
    estado_sunat: EstadoSunatEnum.optional().openapi({
      description: 'Filtrar por estado SUNAT',
      example: 'ACEPTADO',
    }),
    motivo: MotivoTrasladoEnum.optional().openapi({
      description: 'Filtrar por motivo de traslado',
      example: 'VENTA',
    }),
    fecha_inicio: z.string().datetime().optional().openapi({
      description: 'Fecha de inicio del rango de emisión',
      example: '2025-12-01T00:00:00Z',
    }),
    fecha_fin: z.string().datetime().optional().openapi({
      description: 'Fecha fin del rango de emisión',
      example: '2025-12-31T23:59:59Z',
    }),
  })
);
export type ListGuiasRemisionQueryDTO = z.infer<typeof ListGuiasRemisionQuerySchema>;

/**
 * Schema de respuesta paginada para Guías de Remisión
 */
export const PaginatedGuiaRemisionResponseSchema = createPaginatedResponseSchema(
  GuiaRemisionResponseSchema,
  'PaginatedGuiaRemisionResponse'
);
