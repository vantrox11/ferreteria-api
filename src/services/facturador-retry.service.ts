/**
 * SERVICIO DE REINTENTO DE COMPROBANTES SUNAT
 * 
 * Patrón "Outbox/Sweep":
 * - Escanea comprobantes con estado_sunat = 'PENDIENTE'
 * - Reintenta enviarlos al facturador
 * - Actualiza el estado según la respuesta
 * 
 * Este servicio es llamado por el Cron Job cada 10 minutos
 */

import { dbBase } from '../config/db';
import { runWithTenant } from '../config/tenant-context';
import { obtenerFacturador, type DatosComprobante, type DatosNotaCredito, type DatosGuiaRemision } from './facturador.service';

// Constantes de configuración
const TIEMPO_MINIMO_ESPERA_MS = 5 * 60 * 1000; // 5 minutos - evitar competir con ventas en curso
const LOTE_MAXIMO = 50; // Procesar máximo 50 comprobantes por ejecución

/**
 * Procesa todas las ventas pendientes de envío a SUNAT
 */
export const procesarVentasPendientes = async (): Promise<{ procesadas: number; exitosas: number; fallidas: number }> => {
    const stats = { procesadas: 0, exitosas: 0, fallidas: 0 };

    // Usar dbBase para obtener TODAS las ventas pendientes (sin filtro de tenant)
    const ventasPendientes = await dbBase.ventas.findMany({
        where: {
            estado_sunat: 'PENDIENTE',
            created_at: {
                lt: new Date(Date.now() - TIEMPO_MINIMO_ESPERA_MS) // Solo ventas de hace > 5 min
            }
        },
        include: {
            cliente: {
                select: {
                    nombre: true,
                    documento_identidad: true,
                    ruc: true,
                    razon_social: true,
                }
            },
            VentaDetalles: {
                include: {
                    producto: {
                        select: { nombre: true }
                    }
                }
            },
            serie: true,
            tenant: { select: { id: true, subdominio: true } }
        },
        take: LOTE_MAXIMO,
        orderBy: { created_at: 'asc' } // Procesar las más antiguas primero
    });

    if (ventasPendientes.length === 0) {
        return stats;
    }

    console.log(`📋 [RETRY] Encontradas ${ventasPendientes.length} ventas pendientes`);

    const facturador = obtenerFacturador();

    for (const venta of ventasPendientes) {
        stats.procesadas++;

        try {
            // Ejecutar dentro del contexto del tenant
            await runWithTenant(venta.tenant_id, async () => {
                console.log(`⚡ [RETRY] Procesando Venta ${venta.serie?.codigo || 'SIN-SERIE'}-${venta.numero_comprobante} (Tenant: ${venta.tenant?.subdominio})`);

                // Calcular totales desde los detalles
                let totalGravado = 0;
                let totalIGV = 0;

                for (const det of venta.VentaDetalles) {
                    const valorUnitario = Number(det.valor_unitario);
                    const cantidad = Number(det.cantidad);
                    const igvTotal = Number(det.igv_total);

                    totalGravado += valorUnitario * cantidad;
                    totalIGV += igvTotal;
                }

                // Reconstruir payload para facturador
                const datosComprobante: DatosComprobante = {
                    tipo_documento: venta.serie?.tipo_comprobante === 'FACTURA' ? 'FACTURA' : 'BOLETA',
                    serie: venta.serie?.codigo || 'B001',
                    numero: venta.numero_comprobante || 0,
                    fecha_emision: venta.created_at,
                    cliente_documento: venta.cliente?.ruc || venta.cliente?.documento_identidad || null,
                    cliente_nombre: venta.cliente?.razon_social || venta.cliente?.nombre || 'CLIENTE GENERICO',
                    items: venta.VentaDetalles.map((det) => ({
                        descripcion: det.producto?.nombre || `Producto ${det.producto_id}`,
                        cantidad: Number(det.cantidad),
                        precio_unitario: Number(det.precio_unitario),
                        valor_unitario: Number(det.valor_unitario),
                        igv_item: Number(det.igv_total),
                    })),
                    total_gravado: Number(totalGravado.toFixed(2)),
                    total_igv: Number(totalIGV.toFixed(2)),
                    total: Number(venta.total),
                };

                // Emitir comprobante
                const respuesta = await facturador.emitirComprobante(datosComprobante);

                // Actualizar venta con resultado
                await dbBase.ventas.update({
                    where: { id: venta.id },
                    data: {
                        estado_sunat: respuesta.estado,
                        xml_url: respuesta.xml_url,
                        cdr_url: respuesta.cdr_url,
                        hash_cpe: respuesta.hash_cpe,
                        codigo_qr: respuesta.codigo_qr,
                    },
                });

                if (respuesta.exito) {
                    stats.exitosas++;
                    console.log(`✅ [RETRY] Venta ${venta.id} → ${respuesta.estado}`);
                } else {
                    stats.fallidas++;
                    console.log(`❌ [RETRY] Venta ${venta.id} → ${respuesta.estado}: ${respuesta.mensaje}`);
                }
            });
        } catch (error) {
            stats.fallidas++;
            console.error(`🔥 [RETRY] Error procesando venta ${venta.id}:`, error instanceof Error ? error.message : error);
        }
    }

    return stats;
};

/**
 * Procesa todas las Notas de Crédito pendientes de envío a SUNAT
 */
export const procesarNotasCreditoPendientes = async (): Promise<{ procesadas: number; exitosas: number; fallidas: number }> => {
    const stats = { procesadas: 0, exitosas: 0, fallidas: 0 };

    const ncPendientes = await dbBase.notasCredito.findMany({
        where: {
            estado_sunat: 'PENDIENTE',
            created_at: {
                lt: new Date(Date.now() - TIEMPO_MINIMO_ESPERA_MS)
            }
        },
        include: {
            serie: true,
            venta_referencia: {
                include: { serie: true }
            },
            detalles: {
                include: {
                    producto: { select: { nombre: true } }
                }
            },
        },
        take: LOTE_MAXIMO,
        orderBy: { created_at: 'asc' }
    });

    if (ncPendientes.length === 0) {
        return stats;
    }

    console.log(`📋 [RETRY] Encontradas ${ncPendientes.length} Notas de Crédito pendientes`);

    const facturador = obtenerFacturador();

    for (const nc of ncPendientes) {
        stats.procesadas++;

        try {
            await runWithTenant(nc.tenant_id, async () => {
                console.log(`⚡ [RETRY] Procesando NC ${nc.serie?.codigo || 'NC'}-${nc.numero} (Tenant ID: ${nc.tenant_id})`);

                const ventaRef = nc.venta_referencia;
                const tipoDocRef = ventaRef?.serie?.tipo_comprobante === 'FACTURA' ? 'FACTURA' : 'BOLETA';

                // Calcular totales desde los detalles
                let totalGravado = 0;
                let totalIGV = 0;

                for (const det of nc.detalles) {
                    const valorUnitario = Number(det.valor_unitario);
                    const cantidad = Number(det.cantidad);
                    const igvTotal = Number(det.igv_total);

                    totalGravado += valorUnitario * cantidad;
                    totalIGV += igvTotal;
                }

                const datosNC: DatosNotaCredito = {
                    tipo_documento: tipoDocRef,
                    serie: nc.serie?.codigo || 'BN01',
                    numero: nc.numero || 0,
                    fecha_emision: nc.fecha_emision || nc.created_at,
                    cliente_documento: null, // TODO: Obtener del cliente
                    cliente_nombre: 'CLIENTE',
                    documento_referencia_tipo: tipoDocRef,
                    documento_referencia_serie: ventaRef?.serie?.codigo || '',
                    documento_referencia_numero: ventaRef?.numero_comprobante || 0,
                    tipo_nota: nc.tipo_nota,
                    motivo: nc.motivo_sustento,
                    items: nc.detalles.map((det) => ({
                        descripcion: det.producto?.nombre || `Producto ${det.producto_id}`,
                        cantidad: Number(det.cantidad),
                        precio_unitario: Number(det.precio_unitario),
                        valor_unitario: Number(det.valor_unitario),
                        igv_item: Number(det.igv_total),
                    })),
                    total_gravado: Number(totalGravado.toFixed(2)),
                    total_igv: Number(totalIGV.toFixed(2)),
                    total: Number(nc.monto_total),
                };

                const respuesta = await facturador.emitirNotaCredito(datosNC);

                await dbBase.notasCredito.update({
                    where: { id: nc.id },
                    data: {
                        estado_sunat: respuesta.estado,
                        xml_url: respuesta.xml_url,
                        cdr_url: respuesta.cdr_url,
                        hash_cpe: respuesta.hash_cpe,
                    },
                });

                if (respuesta.exito) {
                    stats.exitosas++;
                    console.log(`✅ [RETRY] NC ${nc.id} → ${respuesta.estado}`);
                } else {
                    stats.fallidas++;
                    console.log(`❌ [RETRY] NC ${nc.id} → ${respuesta.estado}: ${respuesta.mensaje}`);
                }
            });
        } catch (error) {
            stats.fallidas++;
            console.error(`🔥 [RETRY] Error procesando NC ${nc.id}:`, error instanceof Error ? error.message : error);
        }
    }

    return stats;
};

/**
 * Procesa todas las Guías de Remisión pendientes de envío a SUNAT
 */
export const procesarGuiasRemisionPendientes = async (): Promise<{ procesadas: number; exitosas: number; fallidas: number }> => {
    const stats = { procesadas: 0, exitosas: 0, fallidas: 0 };

    const guiasPendientes = await dbBase.guiasRemision.findMany({
        where: {
            estado_sunat: 'PENDIENTE',
            created_at: {
                lt: new Date(Date.now() - TIEMPO_MINIMO_ESPERA_MS)
            }
        },
        include: {
            serie: true,
            detalles: {
                include: {
                    producto: {
                        include: { unidad_medida: true }
                    }
                }
            },
        },
        take: LOTE_MAXIMO,
        orderBy: { created_at: 'asc' }
    });

    if (guiasPendientes.length === 0) {
        return stats;
    }

    console.log(`📋 [RETRY] Encontradas ${guiasPendientes.length} Guías de Remisión pendientes`);

    const facturador = obtenerFacturador();

    for (const guia of guiasPendientes) {
        stats.procesadas++;

        try {
            await runWithTenant(guia.tenant_id, async () => {
                console.log(`⚡ [RETRY] Procesando GRE ${guia.serie?.codigo || 'T001'}-${guia.numero} (Tenant ID: ${guia.tenant_id})`);

                const datosGuia: DatosGuiaRemision = {
                    serie: guia.serie?.codigo || 'T001',
                    numero: guia.numero || 0,
                    fecha_emision: guia.fecha_emision || guia.created_at,
                    fecha_inicio_traslado: guia.fecha_inicio_traslado,
                    motivo_traslado: guia.motivo_traslado,
                    descripcion_motivo: guia.descripcion_motivo || undefined,
                    direccion_partida: guia.direccion_partida,
                    ubigeo_partida: guia.ubigeo_partida || undefined,
                    direccion_llegada: guia.direccion_llegada,
                    ubigeo_llegada: guia.ubigeo_llegada || undefined,
                    modalidad_transporte: guia.modalidad_transporte as 'PRIVADO' | 'PUBLICO',
                    ruc_transportista: guia.ruc_transportista || undefined,
                    razon_social_transportista: guia.razon_social_transportista || undefined,
                    placa_vehiculo: guia.placa_vehiculo || undefined,
                    licencia_conducir: guia.licencia_conducir || undefined,
                    nombre_conductor: guia.nombre_conductor || undefined,
                    peso_bruto_total: Number(guia.peso_bruto_total),
                    numero_bultos: guia.numero_bultos,
                    items: guia.detalles.map((det) => ({
                        descripcion: det.producto?.nombre || `Producto ${det.producto_id}`,
                        cantidad: Number(det.cantidad),
                        unidad_medida: det.producto?.unidad_medida?.codigo || 'NIU',
                    })),
                };

                const respuesta = await facturador.emitirGuiaRemision(datosGuia);

                await dbBase.guiasRemision.update({
                    where: { id: guia.id },
                    data: {
                        estado_sunat: respuesta.estado,
                        xml_url: respuesta.xml_url,
                        cdr_url: respuesta.cdr_url,
                        hash_cpe: respuesta.hash_cpe,
                    },
                });

                if (respuesta.exito) {
                    stats.exitosas++;
                    console.log(`✅ [RETRY] GRE ${guia.id} → ${respuesta.estado}`);
                } else {
                    stats.fallidas++;
                    console.log(`❌ [RETRY] GRE ${guia.id} → ${respuesta.estado}: ${respuesta.mensaje}`);
                }
            });
        } catch (error) {
            stats.fallidas++;
            console.error(`🔥 [RETRY] Error procesando GRE ${guia.id}:`, error instanceof Error ? error.message : error);
        }
    }

    return stats;
};

/**
 * Función principal del Cron: Procesa TODOS los tipos de comprobantes pendientes
 */
export const procesarComprobantesPendientes = async (): Promise<void> => {
    console.log('');
    console.log('🔄 ═══════════════════════════════════════════════════════════');
    console.log('🔄 [CRON] Iniciando barrido de comprobantes SUNAT pendientes...');
    console.log('🔄 ═══════════════════════════════════════════════════════════');

    const inicio = Date.now();

    try {
        // Procesar cada tipo de documento en secuencia
        const statsVentas = await procesarVentasPendientes();
        const statsNC = await procesarNotasCreditoPendientes();
        const statsGuias = await procesarGuiasRemisionPendientes();

        const totalProcesadas = statsVentas.procesadas + statsNC.procesadas + statsGuias.procesadas;
        const totalExitosas = statsVentas.exitosas + statsNC.exitosas + statsGuias.exitosas;
        const totalFallidas = statsVentas.fallidas + statsNC.fallidas + statsGuias.fallidas;
        const duracion = ((Date.now() - inicio) / 1000).toFixed(2);

        console.log('');
        console.log('📊 [CRON] Resumen del barrido:');
        console.log(`   └─ Ventas:     ${statsVentas.procesadas} procesadas (${statsVentas.exitosas} ✅ / ${statsVentas.fallidas} ❌)`);
        console.log(`   └─ Notas Crédito: ${statsNC.procesadas} procesadas (${statsNC.exitosas} ✅ / ${statsNC.fallidas} ❌)`);
        console.log(`   └─ Guías Remisión: ${statsGuias.procesadas} procesadas (${statsGuias.exitosas} ✅ / ${statsGuias.fallidas} ❌)`);
        console.log(`   └─ TOTAL:      ${totalProcesadas} procesadas (${totalExitosas} ✅ / ${totalFallidas} ❌)`);
        console.log(`   └─ Duración:   ${duracion}s`);
        console.log('🔄 ═══════════════════════════════════════════════════════════');
        console.log('');

    } catch (error) {
        console.error('🔥 [CRON] Error crítico en barrido de comprobantes:', error);
        throw error; // Re-lanzar para que el cron manager lo capture
    }
};
