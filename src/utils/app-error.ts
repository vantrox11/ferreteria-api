/**
 * Clase AppError tipada para manejo consistente de errores en la aplicación.
 * Reemplaza el patrón `(err as any).code = '...'` por una clase estructurada.
 */
export class AppError extends Error {
    /** Código único del error para identificación programática */
    readonly code: string;

    /** Código de estado HTTP sugerido */
    readonly statusCode: number;

    /** Datos adicionales del error (ej. campos faltantes, valores inválidos) */
    readonly data?: Record<string, unknown>;

    /** Indica si este error es operacional (esperado) vs programático (bug) */
    readonly isOperational: boolean;

    constructor(
        message: string,
        code: string,
        statusCode: number = 400,
        data?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.data = data;
        this.isOperational = true;

        // Captura correcta del stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convierte el error a un objeto serializable para respuestas JSON
     */
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(this.data && { data: this.data }),
            },
        };
    }
}

// ============================================
// Errores predefinidos por dominio
// ============================================

/** Errores de autenticación y autorización */
export class AuthError extends AppError {
    constructor(message: string, code: string = 'AUTH_ERROR') {
        super(message, code, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'No tiene permisos para esta acción') {
        super(message, 'FORBIDDEN', 403);
    }
}

/** Errores de validación de datos */
export class ValidationError extends AppError {
    constructor(message: string, data?: Record<string, unknown>) {
        super(message, 'VALIDATION_ERROR', 400, data);
    }
}

/** Errores de recursos no encontrados */
export class NotFoundError extends AppError {
    constructor(resource: string, id?: number | string) {
        const message = id
            ? `${resource} con ID ${id} no encontrado`
            : `${resource} no encontrado`;
        super(message, `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`, 404);
    }
}

/** Errores de stock insuficiente */
export class StockInsuficienteError extends AppError {
    constructor(producto: string, disponible: number, requerido: number) {
        super(
            `Stock insuficiente para "${producto}". Disponible: ${disponible}, Requerido: ${requerido}`,
            'STOCK_INSUFICIENTE',
            400,
            { producto, disponible, requerido }
        );
    }
}

/** Errores de conflicto de concurrencia */
export class ConcurrencyError extends AppError {
    constructor(resource: string) {
        super(
            `Conflicto de concurrencia al actualizar ${resource}. Otro usuario modificó el registro. Por favor, intente nuevamente.`,
            'CONCURRENCY_CONFLICT',
            409
        );
    }
}

/** Errores fiscales (SUNAT) */
export class FiscalError extends AppError {
    constructor(message: string, code: string = 'FISCAL_ERROR') {
        super(message, code, 400);
    }
}

export class ComprobanteAceptadoError extends FiscalError {
    constructor() {
        super(
            'No se puede modificar o eliminar un comprobante ya aceptado por SUNAT',
            'COMPROBANTE_SUNAT_ACEPTADO'
        );
    }
}

/** Errores de sesión de caja */
export class SesionCajaError extends AppError {
    constructor(message: string, code: string = 'SESION_CAJA_ERROR') {
        super(message, code, 400);
    }
}

export class SaldoCajaInsuficienteError extends SesionCajaError {
    constructor(disponible: number, requerido: number) {
        super(
            `Saldo de caja insuficiente. Disponible: S/ ${disponible.toFixed(2)}, Requerido: S/ ${requerido.toFixed(2)}`,
            'SALDO_CAJA_INSUFICIENTE'
        );
    }
}

// ============================================
// Utilidades
// ============================================

/**
 * Type guard para verificar si un error es AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Convierte un error desconocido a AppError si es necesario
 */
export function toAppError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    if (error instanceof Error) {
        // Manejar errores de Prisma conocidos
        const prismaError = error as any;
        if (prismaError.code === 'P2002') {
            return new ValidationError('Ya existe un registro con esos datos únicos', {
                fields: prismaError.meta?.target,
            });
        }
        if (prismaError.code === 'P2025') {
            return new NotFoundError('Registro');
        }

        return new AppError(error.message, 'INTERNAL_ERROR', 500);
    }

    return new AppError('Error desconocido', 'UNKNOWN_ERROR', 500);
}
