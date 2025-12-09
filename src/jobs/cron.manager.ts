/**
 * GESTOR DE CRON JOBS
 * 
 * Centraliza la configuración e inicialización de todas las tareas programadas.
 * Usa node-cron para scheduling con sintaxis estándar de crontab.
 * 
 * IMPORTANTE: Los jobs se ejecutan en el mismo proceso que el servidor Express.
 * Para producción de alta escala, considera migrar a un servicio separado.
 */

import cron from 'node-cron';
import { procesarComprobantesPendientes } from '../services/facturador-retry.service';

// Configuración de schedules (editar aquí para cambiar frecuencias)
const SCHEDULES = {
    // Formato cron: minuto hora día mes día-semana
    // '*/10 * * * *' = cada 10 minutos
    FACTURACION_RETRY: '*/10 * * * *',
} as const;

// Flag para evitar ejecuciones concurrentes
let facturacionRetryEnProgreso = false;

/**
 * Job: Reintentar comprobantes SUNAT pendientes
 */
const jobFacturacionRetry = async (): Promise<void> => {
    // Evitar ejecuciones concurrentes
    if (facturacionRetryEnProgreso) {
        console.log('⏸️ [CRON] Facturación Retry ya en progreso, saltando...');
        return;
    }

    facturacionRetryEnProgreso = true;

    try {
        await procesarComprobantesPendientes();
    } catch (error) {
        console.error('🔥 [CRON] Error en job de Facturación Retry:', error);
    } finally {
        facturacionRetryEnProgreso = false;
    }
};

/**
 * Inicializa todos los Cron Jobs de la aplicación
 * Llamar esta función una vez al iniciar el servidor
 */
export const initCronJobs = (): void => {
    console.log('');
    console.log('⏰ ═══════════════════════════════════════════════════════════');
    console.log('⏰ [CRON] Inicializando tareas programadas...');

    // Job 1: Facturación Retry
    cron.schedule(SCHEDULES.FACTURACION_RETRY, jobFacturacionRetry);
    console.log(`   └─ Facturación Retry: ${SCHEDULES.FACTURACION_RETRY} (cada 10 min)`);

    // Aquí puedes agregar más jobs en el futuro:
    // - Actualización de estados de cuentas por cobrar vencidas
    // - Limpieza de sesiones de caja huérfanas
    // - Generación de reportes automáticos
    // - Envío de notificaciones por email

    console.log('⏰ [CRON] Todas las tareas programadas inicializadas ✅');
    console.log('⏰ ═══════════════════════════════════════════════════════════');
    console.log('');
};

/**
 * Ejecuta el job de facturación inmediatamente (para testing/debug)
 */
export const runFacturacionRetryNow = async (): Promise<void> => {
    console.log('🔧 [CRON] Ejecutando Facturación Retry manualmente...');
    await jobFacturacionRetry();
};
