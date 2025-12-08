/**
 * MODELO DE GUÍAS DE REMISIÓN
 * 
 * Gestiona la lógica de negocio para:
 * - Emisión de Guías de Remisión Remitente (GRE)
 * - Documentación de traslados de mercadería
 * - Validación de datos de transporte
 * - Envío a SUNAT (vía Mock o Real)
 * - Series controladas por tabla Series (no hardcoded)
 */

import { db } from '../config/db';
import { CreateGuiaRemisionDTO } from '../dtos/guia-remision.dto';
import { obtenerFacturador, type DatosGuiaRemision } from '../services/facturador.service';
import { Prisma, Series_tipo_comprobante } from '@prisma/client';
import { obtenerSerieActiva, incrementarCorrelativo } from '../utils/series.helper';

/**
 * Crea una Guía de Remisión y la envía a SUNAT
 * 
 * ALGORITMO:
 * 1. Validar que los productos existan y tengan unidad de medida
 * 2. Si está asociada a una venta, verificar que exista
 * 3. Obtener serie y correlativo
 * 4. Crear registro de guía con detalles
 * 5. Enviar a SUNAT (Mock o Real)
 */
export const createGuiaRemision = async (
  tenantId: number,
  data: CreateGuiaRemisionDTO,
  usuarioId: number
) => {
  return db.$transaction(async (tx) => {
    // 1. Validar que la venta exista (si se proporcionó)
    if (data.venta_id) {
      const venta = await tx.ventas.findFirst({
        where: {
          id: data.venta_id,
          tenant_id: tenantId,
        },
      });
      
      if (!venta) {
        throw Object.assign(
          new Error('Venta no encontrada'),
          { code: 'VENTA_NOT_FOUND' }
        );
      }

      // ⚠️ REGLA DE INTEGRIDAD FISCAL: "El Candado SUNAT"
      // NO se puede emitir Guía si la venta NO está ACEPTADA por SUNAT
      if (venta.estado_sunat !== 'ACEPTADO') {
        throw Object.assign(
          new Error(
            `No se puede emitir Guía de Remisión. La venta original tiene estado SUNAT: ${venta.estado_sunat}. ` +
            `Solo se pueden emitir guías para comprobantes ACEPTADOS por SUNAT.`
          ),
          { code: 'VENTA_NO_ACEPTADA_SUNAT' }
        );
      }

      // 🚫 REGLA DE BLOQUEO POR NOTAS DE CRÉDITO BLOQUEANTES
      // Verificar si la venta tiene NC de Anulación (01) o Devolución Total (07)
      // con estado ACEPTADO o PENDIENTE
      console.log('🔍 [GRE] Verificando existencia de NC bloqueantes...');
      
      const notasCreditoBloqueantes = await tx.notasCredito.findMany({
        where: {
          tenant_id: tenantId,
          venta_referencia_id: data.venta_id,
          tipo_nota: {
            in: ['ANULACION_DE_LA_OPERACION', 'DEVOLUCION_TOTAL'],
          },
          estado_sunat: {
            in: ['ACEPTADO', 'PENDIENTE'],
          },
        },
        select: {
          id: true,
          tipo_nota: true,
          estado_sunat: true,
          serie: {
            select: {
              codigo: true,
            },
          },
          numero: true,
        },
      });

      if (notasCreditoBloqueantes.length > 0) {
        const nc = notasCreditoBloqueantes[0];
        const tipoDescripcion = nc.tipo_nota === 'ANULACION_DE_LA_OPERACION' 
          ? 'ANULACIÓN DE LA OPERACIÓN' 
          : 'DEVOLUCIÓN TOTAL';
        const serieNumero = `${nc.serie?.codigo || 'NC'}-${String(nc.numero).padStart(6, '0')}`;
        
        throw Object.assign(
          new Error(
            `❌ No se puede emitir Guía de Remisión.\n\n` +
            `La venta tiene una Nota de Crédito de tipo "${tipoDescripcion}" (${serieNumero}) ` +
            `con estado ${nc.estado_sunat}.\n\n` +
            `Las ventas anuladas o totalmente devueltas no pueden generar guías de remisión ` +
            `porque no existe mercadería válida para trasladar.\n\n` +
            `💡 Sugerencia: Verifica el estado de la venta en el historial de Notas de Crédito.`
          ),
          { 
            code: 'VENTA_BLOQUEADA_POR_NC',
            data: {
              nota_credito_id: nc.id,
              tipo_nota: nc.tipo_nota,
              estado_sunat: nc.estado_sunat,
              serie_numero: serieNumero,
            }
          }
        );
      }

      console.log('✅ [GRE] No se encontraron NC bloqueantes. Venta válida para generar guía.');
    }
    
    // 2. Validar que los productos existan
    for (const detalle of data.detalles) {
      const producto = await tx.productos.findFirst({
        where: {
          id: detalle.producto_id,
          tenant_id: tenantId,
        },
        include: {
          unidad_medida: true,
        },
      });
      
      if (!producto) {
        throw Object.assign(
          new Error(`Producto con ID ${detalle.producto_id} no encontrado`),
          { code: 'PRODUCTO_NOT_FOUND' }
        );
      }
    }
    
    // 3. Obtener serie activa para GUIA_REMISION
    const serieActiva = await obtenerSerieActiva(tenantId, Series_tipo_comprobante.GUIA_REMISION, undefined, tx);
    const nuevoCorrelativo = await incrementarCorrelativo(serieActiva.id, tx);
    
    console.log(`📄 [GRE] Serie asignada: ${serieActiva.codigo}-${nuevoCorrelativo}`);
    
    // 4. Crear la Guía de Remisión
    const guiaRemision = await tx.guiasRemision.create({
      data: {
        tenant_id: tenantId,
        serie_id: serieActiva.id,          // ✅ Relación con tabla Series
        numero: nuevoCorrelativo,           // ✅ Correlativo controlado
        motivo_traslado: data.motivo_traslado,
        descripcion_motivo: data.descripcion_motivo,
        peso_bruto_total: data.peso_bruto_total,
        numero_bultos: data.numero_bultos,
        direccion_partida: data.direccion_partida,
        ubigeo_partida: data.ubigeo_partida,
        direccion_llegada: data.direccion_llegada,
        ubigeo_llegada: data.ubigeo_llegada,
        modalidad_transporte: data.modalidad_transporte,
        ruc_transportista: data.ruc_transportista,
        razon_social_transportista: data.razon_social_transportista,
        placa_vehiculo: data.placa_vehiculo,
        licencia_conducir: data.licencia_conducir,
        nombre_conductor: data.nombre_conductor,
        fecha_inicio_traslado: new Date(data.fecha_inicio_traslado),
        venta_id: data.venta_id,
        usuario_id: usuarioId,
        estado_sunat: 'PENDIENTE',
        fecha_emision: new Date(),
      },
    });
    
    // Crear detalles de la guía
    for (const detalle of data.detalles) {
      await tx.guiaRemisionDetalles.create({
        data: {
          tenant_id: tenantId,
          guia_remision_id: guiaRemision.id,
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
        },
      });
    }
    
    // 5. [ENVÍO A SUNAT] - Llamar al facturador (Mock o Real)
    console.log('📡 [GRE] Enviando a SUNAT...');
    
    // Obtener nombres de productos para el XML
    const productosConNombres = await Promise.all(
      data.detalles.map(async (d) => {
        const producto = await tx.productos.findFirst({
          where: { id: d.producto_id },
          include: { unidad_medida: true },
        });
        return {
          descripcion: producto?.nombre || `Producto ${d.producto_id}`,
          cantidad: d.cantidad,
          unidad_medida: producto?.unidad_medida?.codigo || 'NIU',
        };
      })
    );
    
    const datosParaSunat: DatosGuiaRemision = {
      serie: serieActiva.codigo,          // ✅ Usar código de la serie (ej: "T001")
      numero: nuevoCorrelativo,           // ✅ Usar nuevo correlativo
      fecha_emision: new Date(),
      fecha_inicio_traslado: new Date(data.fecha_inicio_traslado),
      motivo_traslado: data.motivo_traslado,
      descripcion_motivo: data.descripcion_motivo,
      direccion_partida: data.direccion_partida,
      ubigeo_partida: data.ubigeo_partida,
      direccion_llegada: data.direccion_llegada,
      ubigeo_llegada: data.ubigeo_llegada,
      modalidad_transporte: data.modalidad_transporte,
      ruc_transportista: data.ruc_transportista,
      razon_social_transportista: data.razon_social_transportista,
      placa_vehiculo: data.placa_vehiculo,
      licencia_conducir: data.licencia_conducir,
      nombre_conductor: data.nombre_conductor,
      peso_bruto_total: data.peso_bruto_total,
      numero_bultos: data.numero_bultos,
      items: productosConNombres,
    };
    
    try {
      const facturador = obtenerFacturador();
      const respuestaSunat = await facturador.emitirGuiaRemision(datosParaSunat);
      
      if (respuestaSunat.exito) {
        // Actualizar con datos de SUNAT
        await tx.guiasRemision.update({
          where: { id: guiaRemision.id },
          data: {
            estado_sunat: 'ACEPTADO',
            xml_url: respuestaSunat.xml_url,
            cdr_url: respuestaSunat.cdr_url,
            hash_cpe: respuestaSunat.hash_cpe,
          },
        });
        
        console.log('✅ [GRE] ACEPTADA por SUNAT');
      } else {
        // Marcar como rechazada
        await tx.guiasRemision.update({
          where: { id: guiaRemision.id },
          data: {
            estado_sunat: 'RECHAZADO',
          },
        });
        
        console.error('❌ [GRE] RECHAZADA por SUNAT:', respuestaSunat.mensaje);
      }
    } catch (error) {
      console.error('⚠️ [GRE] Error al enviar a SUNAT:', error);
      // Marcar como pendiente para reintento
      await tx.guiasRemision.update({
        where: { id: guiaRemision.id },
        data: {
          estado_sunat: 'PENDIENTE',
        },
      });
    }
    
    return guiaRemision;
  });
};

/**
 * Lista Guías de Remisión con paginación y filtros
 */
export const listGuiasRemision = async (
  tenantId: number,
  filters: {
    page?: number;
    limit?: number;
    q?: string;
    venta_id?: number;
    estado_sunat?: string;
    motivo?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: Prisma.GuiasRemisionWhereInput = {
    tenant_id: tenantId,
  };
  
  // Filtros
  if (filters.venta_id) {
    where.venta_id = filters.venta_id;
  }
  
  if (filters.estado_sunat) {
    where.estado_sunat = filters.estado_sunat as any;
  }
  
  if (filters.motivo) {
    where.motivo_traslado = filters.motivo as any;
  }
  
  if (filters.fecha_inicio || filters.fecha_fin) {
    where.fecha_emision = {};
    if (filters.fecha_inicio) {
      where.fecha_emision.gte = filters.fecha_inicio;
    }
    if (filters.fecha_fin) {
      where.fecha_emision.lte = filters.fecha_fin;
    }
  }
  
  if (filters.q) {
    where.OR = [
      { serie: { codigo: { contains: filters.q } } },  // ✅ Buscar en serie.codigo
      { numero: isNaN(Number(filters.q)) ? undefined : Number(filters.q) },
    ];
  }
  
  const [data, total] = await Promise.all([
    db.guiasRemision.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        serie: true,  // ✅ Incluir serie para mostrar código
        venta: {
          include: {
            serie: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
              },
            },
          },
        },
      },
    }),
    db.guiasRemision.count({ where }),
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtiene una Guía de Remisión por ID
 */
export const getGuiaRemisionById = async (tenantId: number, id: number) => {
  const guiaRemision = await db.guiasRemision.findFirst({
    where: {
      id,
      tenant_id: tenantId,
    },
    include: {
      serie: true,  // ✅ Incluir serie
      venta: {
        include: {
          serie: true,
        },
      },
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      detalles: {
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
            },
          },
        },
      },
    },
  });
  
  if (!guiaRemision) {
    throw Object.assign(
      new Error('Guía de Remisión no encontrada'),
      { code: 'GRE_NOT_FOUND' }
    );
  }
  
  return guiaRemision;
};
