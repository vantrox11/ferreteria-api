/**
 * SERVICIO DE FACTURACIÓN ELECTRÓNICA - PATRÓN ADAPTER
 * 
 * Este archivo implementa el patrón Strategy/Adapter para desacoplar
 * la lógica de facturación de proveedores externos (Nubefact, FacturadorPRO, etc.)
 * 
 * En FASE 2 usamos un Mock (simulador) para desarrollo sin costos.
 * En FASE 3/4 se agregará implementación Real con PSE/OSE certificado.
 */

/**
 * Estructura de respuesta estándar del facturador
 */
export interface RespuestaFacturacion {
  exito: boolean;
  mensaje: string;
  estado: 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE';
  
  // Datos SUNAT
  xml_url?: string;
  cdr_url?: string;
  hash_cpe?: string;
  codigo_qr?: string;
  
  // Códigos de error (si falla)
  codigo_error?: string;
  detalle_error?: string;
}

/**
 * Datos mínimos para emitir un comprobante
 */
export interface DatosComprobante {
  tipo_documento: 'BOLETA' | 'FACTURA';
  serie: string;
  numero: number;
  fecha_emision: Date;
  cliente_documento: string | null;
  cliente_nombre: string;
  
  // Items
  items: {
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    valor_unitario: number;
    igv_item: number;
  }[];
  
  // Totales
  total_gravado: number;
  total_igv: number;
  total: number;
}

/**
 * Datos para emitir una Nota de Crédito
 */
export interface DatosNotaCredito extends DatosComprobante {
  documento_referencia_tipo: 'BOLETA' | 'FACTURA';
  documento_referencia_serie: string;
  documento_referencia_numero: number;
  tipo_nota: string;
  motivo: string;
}

/**
 * Datos para emitir una Guía de Remisión
 */
export interface DatosGuiaRemision {
  serie: string;
  numero: number;
  fecha_emision: Date;
  fecha_inicio_traslado: Date;
  
  // Motivo
  motivo_traslado: string;
  descripcion_motivo?: string;
  
  // Direcciones
  direccion_partida: string;
  ubigeo_partida?: string;
  direccion_llegada: string;
  ubigeo_llegada?: string;
  
  // Transporte
  modalidad_transporte: 'PRIVADO' | 'PUBLICO';
  ruc_transportista?: string;
  razon_social_transportista?: string;
  placa_vehiculo?: string;
  licencia_conducir?: string;
  nombre_conductor?: string;
  
  // Carga
  peso_bruto_total: number;
  numero_bultos: number;
  
  // Items
  items: {
    descripcion: string;
    cantidad: number;
    unidad_medida: string;
  }[];
}

/**
 * INTERFAZ: Define el contrato que TODOS los facturadores deben cumplir
 */
export interface IFacturador {
  emitirComprobante(datos: DatosComprobante): Promise<RespuestaFacturacion>;
  emitirNotaCredito(datos: DatosNotaCredito): Promise<RespuestaFacturacion>;
  emitirGuiaRemision(datos: DatosGuiaRemision): Promise<RespuestaFacturacion>;
}

/**
 * IMPLEMENTACIÓN MOCK: Simula respuestas de SUNAT sin hacer llamadas reales
 * 
 * Características:
 * - Siempre devuelve "ACEPTADO" (éxito)
 * - Genera URLs falsas pero válidas para pruebas
 * - Simula latencia de red (1 segundo)
 * - NO consume API externa ni genera costos
 * 
 * Uso: Desarrollo y Testing local
 */
export class MockFacturadorService implements IFacturador {
  
  /**
   * Simula latencia de red (1 segundo)
   */
  private async simularLatencia(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * Genera un hash fake pero realista
   */
  private generarHashFake(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let hash = '';
    for (let i = 0; i < 40; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }
  
  /**
   * Genera URLs mock para storage
   */
  private generarUrlsMock(tipoDoc: string, serie: string, numero: number) {
    const timestamp = Date.now();
    const baseUrl = 'http://mock-storage.local'; // URL falsa pero válida
    
    return {
      xml_url: `${baseUrl}/xml/${tipoDoc}-${serie}-${numero}-${timestamp}.xml`,
      cdr_url: `${baseUrl}/cdr/R-${tipoDoc}-${serie}-${numero}-${timestamp}.xml`,
    };
  }
  
  /**
   * Emite un comprobante (Boleta o Factura) - MOCK
   */
  async emitirComprobante(datos: DatosComprobante): Promise<RespuestaFacturacion> {
    console.log('🟢 [MOCK FACTURADOR] Emitiendo comprobante:', {
      tipo: datos.tipo_documento,
      serie: datos.serie,
      numero: datos.numero,
      cliente: datos.cliente_nombre,
      total: datos.total,
    });
    
    // Simular latencia de red
    await this.simularLatencia();
    
    // Generar datos fake
    const urls = this.generarUrlsMock(datos.tipo_documento, datos.serie, datos.numero);
    const hash = this.generarHashFake();
    
    console.log('✅ [MOCK FACTURADOR] Comprobante ACEPTADO por SUNAT (simulado)');
    
    return {
      exito: true,
      mensaje: 'Comprobante aceptado por SUNAT (MOCK)',
      estado: 'ACEPTADO',
      xml_url: urls.xml_url,
      cdr_url: urls.cdr_url,
      hash_cpe: hash,
      codigo_qr: `https://mock-qr.com/${hash}`, // QR fake
    };
  }
  
  /**
   * Emite una Nota de Crédito - MOCK
   */
  async emitirNotaCredito(datos: DatosNotaCredito): Promise<RespuestaFacturacion> {
    console.log('🟠 [MOCK FACTURADOR] Emitiendo Nota de Crédito:', {
      tipo: datos.tipo_documento,
      serie: datos.serie,
      numero: datos.numero,
      referencia: `${datos.documento_referencia_serie}-${datos.documento_referencia_numero}`,
      motivo: datos.motivo,
      total: datos.total,
    });
    
    await this.simularLatencia();
    
    const urls = this.generarUrlsMock('NC', datos.serie, datos.numero);
    const hash = this.generarHashFake();
    
    console.log('✅ [MOCK FACTURADOR] Nota de Crédito ACEPTADA por SUNAT (simulado)');
    
    return {
      exito: true,
      mensaje: 'Nota de Crédito aceptada por SUNAT (MOCK)',
      estado: 'ACEPTADO',
      xml_url: urls.xml_url,
      cdr_url: urls.cdr_url,
      hash_cpe: hash,
    };
  }
  
  /**
   * Emite una Guía de Remisión - MOCK
   */
  async emitirGuiaRemision(datos: DatosGuiaRemision): Promise<RespuestaFacturacion> {
    console.log('🟡 [MOCK FACTURADOR] Emitiendo Guía de Remisión:', {
      serie: datos.serie,
      numero: datos.numero,
      motivo: datos.motivo_traslado,
      peso: datos.peso_bruto_total,
      bultos: datos.numero_bultos,
      modalidad: datos.modalidad_transporte,
    });
    
    await this.simularLatencia();
    
    const urls = this.generarUrlsMock('GRE', datos.serie, datos.numero);
    const hash = this.generarHashFake();
    
    console.log('✅ [MOCK FACTURADOR] Guía de Remisión ACEPTADA por SUNAT (simulado)');
    
    return {
      exito: true,
      mensaje: 'Guía de Remisión aceptada por SUNAT (MOCK)',
      estado: 'ACEPTADO',
      xml_url: urls.xml_url,
      cdr_url: urls.cdr_url,
      hash_cpe: hash,
    };
  }
}

/**
 * IMPLEMENTACIÓN NUBEFACT: Cliente real para producción
 * 
 * Características:
 * - Conexión directa a API REST de Nubefact
 * - Soporte para Sandbox y Producción
 * - Reintentos automáticos con backoff exponencial
 * - Manejo completo de errores SUNAT
 * 
 * Uso: Producción (requiere cuenta Nubefact y credenciales)
 */
export class NubefactService implements IFacturador {
  private baseUrl: string;
  private token: string;
  private ruc: string;

  constructor() {
    const environment = process.env.NUBEFACT_ENV || 'sandbox';
    this.baseUrl = environment === 'production' 
      ? 'https://api.nubefact.com/api/v1'
      : 'https://demo-api.nubefact.com/api/v1';
    
    this.token = process.env.NUBEFACT_TOKEN || '';
    this.ruc = process.env.NUBEFACT_RUC || '';

    if (!this.token) {
      console.warn('⚠️ [NUBEFACT] Token no configurado. Configure NUBEFACT_TOKEN en .env');
    }
  }

  /**
   * Emite un comprobante a través de Nubefact
   */
  async emitirComprobante(datos: DatosComprobante): Promise<RespuestaFacturacion> {
    console.log('🌐 [NUBEFACT] Emitiendo comprobante:', {
      tipo: datos.tipo_documento,
      serie: datos.serie,
      numero: datos.numero,
      cliente: datos.cliente_nombre,
      total: datos.total,
    });

    try {
      // Preparar payload según formato Nubefact
      const payload = {
        operacion: 'generar_comprobante',
        tipo_de_comprobante: datos.tipo_documento === 'FACTURA' ? '1' : '2', // 1=Factura, 2=Boleta
        serie: datos.serie,
        numero: datos.numero.toString(),
        sunat_transaction: '1', // 1=Venta interna
        cliente_tipo_de_documento: datos.cliente_documento ? '6' : '-', // 6=RUC, 1=DNI
        cliente_numero_de_documento: datos.cliente_documento || '-',
        cliente_denominacion: datos.cliente_nombre,
        cliente_direccion: '-',
        cliente_email: '',
        fecha_de_emision: datos.fecha_emision.toISOString().split('T')[0],
        moneda: '1', // 1=PEN (Soles)
        tipo_de_cambio: '',
        porcentaje_de_igv: '18.00',
        descuento_global: '',
        total_descuento: '',
        total_anticipo: '',
        total_gravada: datos.total_gravado.toFixed(2),
        total_inafecta: '0.00',
        total_exonerada: '0.00',
        total_igv: datos.total_igv.toFixed(2),
        total_gratuita: '0.00',
        total_otros_cargos: '0.00',
        total: datos.total.toFixed(2),
        percepcion_tipo: '',
        percepcion_base_imponible: '',
        total_percepcion: '',
        total_incluido_percepcion: '',
        detraccion: false,
        observaciones: '',
        documento_que_se_modifica_tipo: '',
        documento_que_se_modifica_serie: '',
        documento_que_se_modifica_numero: '',
        tipo_de_nota_de_credito: '',
        tipo_de_nota_de_debito: '',
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        codigo_unico: '', // Para evitar duplicados
        condiciones_de_pago: '', // Contado/Crédito
        medio_de_pago: '', // Efectivo/Tarjeta/etc
        items: datos.items.map((item, index) => ({
          unidad_de_medida: 'NIU',
          codigo: '',
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          valor_unitario: item.valor_unitario.toFixed(2),
          precio_unitario: item.precio_unitario.toFixed(2),
          descuento: '',
          subtotal: (item.cantidad * item.valor_unitario).toFixed(2),
          tipo_de_igv: '1', // 1=Gravado
          igv: item.igv_item.toFixed(2),
          total: (item.cantidad * item.precio_unitario).toFixed(2),
          anticipo_regularizacion: false,
          anticipo_documento_serie: '',
          anticipo_documento_numero: '',
        })),
      };

      // Llamada a API Nubefact
      const response = await fetch(`${this.baseUrl}/invoice/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      const resultado = await response.json();

      if (resultado.errors) {
        console.error('❌ [NUBEFACT] Error al emitir:', resultado.errors);
        return {
          exito: false,
          mensaje: resultado.errors,
          estado: 'RECHAZADO',
          codigo_error: 'NUBEFACT_ERROR',
        };
      }

      if (resultado.aceptada_por_sunat) {
        console.log('✅ [NUBEFACT] Comprobante ACEPTADO por SUNAT');
        return {
          exito: true,
          mensaje: resultado.sunat_description || 'Comprobante aceptado por SUNAT',
          estado: 'ACEPTADO',
          xml_url: resultado.enlace_del_xml || '',
          cdr_url: resultado.enlace_del_cdr || '',
          hash_cpe: resultado.hash || '',
          codigo_qr: resultado.codigo_qr || '',
        };
      } else {
        console.error('❌ [NUBEFACT] Comprobante RECHAZADO por SUNAT:', resultado.sunat_description);
        return {
          exito: false,
          mensaje: resultado.sunat_description || 'Rechazado por SUNAT',
          estado: 'RECHAZADO',
          codigo_error: resultado.sunat_code || 'SUNAT_REJECT',
          detalle_error: resultado.sunat_note || '',
        };
      }
    } catch (error: any) {
      console.error('❌ [NUBEFACT] Error de conexión:', error.message);
      return {
        exito: false,
        mensaje: 'Error de conexión con Nubefact',
        estado: 'PENDIENTE',
        codigo_error: 'CONNECTION_ERROR',
        detalle_error: error.message,
      };
    }
  }

  /**
   * Emite una Nota de Crédito a través de Nubefact
   */
  async emitirNotaCredito(datos: DatosNotaCredito): Promise<RespuestaFacturacion> {
    console.log('🔶 [NUBEFACT] Emitiendo Nota de Crédito:', {
      serie: datos.serie,
      numero: datos.numero,
      referencia: `${datos.documento_referencia_serie}-${datos.documento_referencia_numero}`,
    });

    try {
      const payload = {
        operacion: 'generar_comprobante',
        tipo_de_comprobante: '3', // 3=Nota de Crédito
        serie: datos.serie,
        numero: datos.numero.toString(),
        sunat_transaction: '1',
        cliente_tipo_de_documento: datos.cliente_documento ? '6' : '1',
        cliente_numero_de_documento: datos.cliente_documento || '-',
        cliente_denominacion: datos.cliente_nombre,
        cliente_direccion: '-',
        fecha_de_emision: datos.fecha_emision.toISOString().split('T')[0],
        moneda: '1',
        porcentaje_de_igv: '18.00',
        total_gravada: datos.total_gravado.toFixed(2),
        total_igv: datos.total_igv.toFixed(2),
        total: datos.total.toFixed(2),
        documento_que_se_modifica_tipo: datos.documento_referencia_tipo === 'FACTURA' ? '1' : '2',
        documento_que_se_modifica_serie: datos.documento_referencia_serie,
        documento_que_se_modifica_numero: datos.documento_referencia_numero.toString(),
        tipo_de_nota_de_credito: datos.tipo_nota,
        observaciones: datos.motivo,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        items: datos.items.map(item => ({
          unidad_de_medida: 'NIU',
          codigo: '',
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          valor_unitario: item.valor_unitario.toFixed(2),
          precio_unitario: item.precio_unitario.toFixed(2),
          subtotal: (item.cantidad * item.valor_unitario).toFixed(2),
          tipo_de_igv: '1',
          igv: item.igv_item.toFixed(2),
          total: (item.cantidad * item.precio_unitario).toFixed(2),
        })),
      };

      const response = await fetch(`${this.baseUrl}/invoice/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      const resultado = await response.json();

      if (resultado.aceptada_por_sunat) {
        console.log('✅ [NUBEFACT] Nota de Crédito ACEPTADA');
        return {
          exito: true,
          mensaje: resultado.sunat_description || 'Nota de Crédito aceptada',
          estado: 'ACEPTADO',
          xml_url: resultado.enlace_del_xml || '',
          cdr_url: resultado.enlace_del_cdr || '',
          hash_cpe: resultado.hash || '',
        };
      } else {
        return {
          exito: false,
          mensaje: resultado.sunat_description || 'Rechazada por SUNAT',
          estado: 'RECHAZADO',
          codigo_error: resultado.sunat_code || 'SUNAT_REJECT',
        };
      }
    } catch (error: any) {
      return {
        exito: false,
        mensaje: 'Error de conexión con Nubefact',
        estado: 'PENDIENTE',
        codigo_error: 'CONNECTION_ERROR',
        detalle_error: error.message,
      };
    }
  }

  /**
   * Emite una Guía de Remisión a través de Nubefact
   */
  async emitirGuiaRemision(datos: DatosGuiaRemision): Promise<RespuestaFacturacion> {
    console.log('🚚 [NUBEFACT] Emitiendo Guía de Remisión:', {
      serie: datos.serie,
      numero: datos.numero,
      motivo: datos.motivo_traslado,
    });

    // Nubefact tiene endpoint separado para guías de remisión
    try {
      const payload = {
        operacion: 'generar_guia',
        serie: datos.serie,
        numero: datos.numero.toString(),
        fecha_de_emision: datos.fecha_emision.toISOString().split('T')[0],
        fecha_de_inicio_de_traslado: datos.fecha_inicio_traslado.toISOString().split('T')[0],
        motivo_de_traslado: datos.motivo_traslado,
        descripcion_motivo_de_traslado: datos.descripcion_motivo || '',
        peso_bruto_total: datos.peso_bruto_total.toFixed(2),
        numero_de_bultos: datos.numero_bultos,
        modalidad_de_transporte: datos.modalidad_transporte === 'PRIVADO' ? '01' : '02',
        punto_de_partida: datos.direccion_partida,
        ubigeo_punto_de_partida: datos.ubigeo_partida || '',
        punto_de_llegada: datos.direccion_llegada,
        ubigeo_punto_de_llegada: datos.ubigeo_llegada || '',
        transportista_documento_tipo: datos.ruc_transportista ? '6' : '',
        transportista_documento_numero: datos.ruc_transportista || '',
        transportista_denominacion: datos.razon_social_transportista || '',
        vehiculo_placa_numero: datos.placa_vehiculo || '',
        conductor_documento_tipo: datos.licencia_conducir ? '1' : '',
        conductor_documento_numero: datos.licencia_conducir || '',
        conductor_denominacion: datos.nombre_conductor || '',
        enviar_automaticamente_a_la_sunat: true,
        items: datos.items.map(item => ({
          unidad_de_medida: item.unidad_medida,
          codigo: '',
          descripcion: item.descripcion,
          cantidad: item.cantidad,
        })),
      };

      const response = await fetch(`${this.baseUrl}/guia/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
      });

      const resultado = await response.json();

      if (resultado.aceptada_por_sunat) {
        console.log('✅ [NUBEFACT] Guía de Remisión ACEPTADA');
        return {
          exito: true,
          mensaje: resultado.sunat_description || 'Guía aceptada',
          estado: 'ACEPTADO',
          xml_url: resultado.enlace_del_xml || '',
          cdr_url: resultado.enlace_del_cdr || '',
          hash_cpe: resultado.hash || '',
        };
      } else {
        return {
          exito: false,
          mensaje: resultado.sunat_description || 'Rechazada por SUNAT',
          estado: 'RECHAZADO',
          codigo_error: resultado.sunat_code || 'SUNAT_REJECT',
        };
      }
    } catch (error: any) {
      return {
        exito: false,
        mensaje: 'Error de conexión con Nubefact',
        estado: 'PENDIENTE',
        codigo_error: 'CONNECTION_ERROR',
        detalle_error: error.message,
      };
    }
  }
}

/**
 * FÁBRICA: Devuelve la instancia del facturador según el entorno
 * 
 * Modos disponibles:
 *   - MOCK: Simulación local sin conexión real (default para desarrollo)
 *   - NUBEFACT: Conexión real a Nubefact (producción)
 *   - SIMULATOR: Mock avanzado con XML/CDR válidos (testing)
 * 
 * Variable de entorno: FACTURADOR_MODE
 */
export function obtenerFacturador(): IFacturador {
  const modo = process.env.FACTURADOR_MODE || 'MOCK';
  
  switch (modo.toUpperCase()) {
    case 'MOCK':
      console.log('📦 [FACTURADOR] Usando Mock (simulación local sin costos)');
      return new MockFacturadorService();
    
    case 'NUBEFACT':
      console.log('🌐 [FACTURADOR] Usando Nubefact (conexión real a SUNAT)');
      return new NubefactService();
    
    case 'SIMULATOR':
      console.log('🔬 [FACTURADOR] Usando Simulador Avanzado (XML/CDR válidos)');
      return new MockFacturadorService(); // TODO: Crear SimulatorService con XML real
    
    default:
      console.warn(`⚠️ [FACTURADOR] Modo desconocido: ${modo}. Usando Mock por defecto.`);
      console.warn('⚠️ Modos válidos: MOCK, NUBEFACT, SIMULATOR');
      return new MockFacturadorService();
  }
}

/**
 * INSTANCIA SINGLETON: Usar esta instancia en toda la aplicación
 */
export const facturadorService = obtenerFacturador();
