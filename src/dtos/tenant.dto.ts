import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '../config/openapi-registry';

extendZodWithOpenApi(z);

/**
 * DTO de respuesta para configuración del tenant
 */
export const TenantConfiguracionResponseSchema = registry.register(
  'TenantConfiguracion',
  z.object({
    id: z.number().int().positive().openapi({
      description: 'ID único del tenant',
      example: 1,
    }),
    nombre_empresa: z.string().openapi({
      description: 'Nombre de la empresa',
      example: 'Ferretería El Constructor',
    }),
    subdominio: z.string().openapi({
      description: 'Subdominio único del tenant',
      example: 'ferreteria-constructor',
    }),
    isActive: z.boolean().openapi({
      description: 'Indica si el tenant está activo',
      example: true,
    }),
    configuracion: z.object({
      pedidos: z.object({
        dias_limite_reserva: z.number().int().openapi({
          description: 'Días límite para reservar stock en pedidos',
          example: 7,
        }),
      }).optional(),
      emails: z.object({
        remitente: z.string().email().optional().openapi({
          description: 'Email remitente para notificaciones',
          example: 'ventas@ferreteria.com',
        }),
        plantilla_confirmacion: z.string().optional().openapi({
          description: 'Plantilla de email para confirmación',
        }),
        plantilla_cancelacion: z.string().optional().openapi({
          description: 'Plantilla de email para cancelación',
        }),
      }).optional(),
      facturacion: z.object({
        impuesto_nombre: z.string().openapi({
          description: 'Nombre del impuesto aplicable',
          example: 'IGV',
        }),
        tasa_impuesto: z.number().openapi({
          description: 'Tasa de impuesto en porcentaje',
          example: 18.00,
        }),
        es_agente_retencion: z.boolean().openapi({
          description: 'Indica si es agente de retención',
          example: false,
        }),
        exonerado_regional: z.boolean().openapi({
          description: 'Indica si tiene exoneración regional',
          example: false,
        }),
      }).optional(),
    }).nullable().openapi({
      description: 'Configuración general del tenant (pedidos, emails, facturación)',
    }),
    created_at: z.string().datetime().openapi({
      description: 'Fecha de creación',
      example: '2024-01-15T10:30:00Z',
    }),
  })
);
export type TenantConfiguracionResponseDTO = z.infer<typeof TenantConfiguracionResponseSchema>;

/**
 * DTO para actualizar configuración general del tenant
 */
export const UpdateTenantConfiguracionSchema = registry.register(
  'UpdateTenantConfiguracion',
  z.object({
    pedidos: z.object({
      dias_limite_reserva: z.number().int().min(1).max(30).openapi({
        description: 'Días límite para reservar stock',
        example: 7,
      }),
    }).partial().optional(),
    emails: z.object({
      remitente: z.string().email().optional().openapi({
        description: 'Email remitente',
        example: 'ventas@ferreteria.com',
      }),
      plantilla_confirmacion: z.string().optional().openapi({
        description: 'Plantilla de confirmación',
      }),
      plantilla_cancelacion: z.string().optional().openapi({
        description: 'Plantilla de cancelación',
      }),
    }).partial().optional(),
    facturacion: z.object({
      impuesto_nombre: z.string().openapi({
        description: 'Nombre del impuesto',
        example: 'IGV',
      }),
      tasa_impuesto: z.number().min(0).max(100).openapi({
        description: 'Tasa de impuesto (%)',
        example: 18.00,
      }),
      es_agente_retencion: z.boolean().openapi({
        description: 'Es agente de retención',
        example: false,
      }),
      exonerado_regional: z.boolean().openapi({
        description: 'Exoneración regional',
        example: false,
      }),
    }).partial().optional(),
  }).passthrough()
);
export type UpdateTenantConfiguracionDTO = z.infer<typeof UpdateTenantConfiguracionSchema>;

/**
 * DTO para obtener/actualizar solo configuración fiscal SUNAT
 */
export const TenantConfigFiscalResponseSchema = registry.register(
  'TenantConfigFiscal',
  z.object({
    impuesto_nombre: z.string().openapi({
      description: 'Nombre del impuesto aplicable',
      example: 'IGV',
    }),
    tasa_impuesto: z.number().openapi({
      description: 'Tasa de impuesto en porcentaje',
      example: 18.00,
    }),
    es_agente_retencion: z.boolean().openapi({
      description: 'Indica si es agente de retención SUNAT',
      example: false,
    }),
    exonerado_regional: z.boolean().openapi({
      description: 'Indica si tiene exoneración regional',
      example: false,
    }),
  })
);
export type TenantConfigFiscalResponseDTO = z.infer<typeof TenantConfigFiscalResponseSchema>;

/**
 * DTO para actualizar configuración fiscal específicamente
 */
export const UpdateTenantConfigFiscalSchema = registry.register(
  'UpdateTenantConfigFiscal',
  z.object({
    impuesto_nombre: z.string().optional().openapi({
      description: 'Nombre del impuesto',
      example: 'IGV',
    }),
    tasa_impuesto: z.number().min(0).max(100).optional().openapi({
      description: 'Tasa de impuesto (%)',
      example: 18.00,
    }),
    es_agente_retencion: z.boolean().optional().openapi({
      description: 'Es agente de retención',
      example: false,
    }),
    exonerado_regional: z.boolean().optional().openapi({
      description: 'Exoneración regional',
      example: false,
    }),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Debe proporcionar al menos un campo tributario a actualizar' }
  )
);
export type UpdateTenantConfigFiscalDTO = z.infer<typeof UpdateTenantConfigFiscalSchema>;
