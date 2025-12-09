import { Prisma } from '@prisma/client';
import { getTenantId } from './tenant-context';

// Modelos globales que NO deben ser filtrados por tenant_id
const MODELOS_SIN_TENANT = ['tenants'];

export function createTenantExtension() {
    return Prisma.defineExtension({
        name: 'tenantFilter',
        model: {
            $allModels: {
                // 🚨 SOLUCIÓN CRÍTICA: Interceptamos findUnique y lo convertimos en findFirst
                // para poder inyectar el filtro tenant_id sin errores de Prisma.
                // Prisma requiere que findUnique use solo campos con @unique, pero tenant_id
                // no es parte de esas claves únicas en la mayoría de modelos.
                async findUnique<T, A>(
                    this: T,
                    args: Prisma.Exact<A, Prisma.Args<T, 'findUnique'>>
                ) {
                    const context = Prisma.getExtensionContext(this) as any;
                    const modelName = (context.$name as string).toLowerCase();
                    const tenantId = getTenantId();

                    // Si es un modelo global o no hay contexto de tenant, comportamiento normal
                    if (MODELOS_SIN_TENANT.includes(modelName) || tenantId === undefined) {
                        return (context as any).findUnique(args);
                    }

                    // Transformación a findFirst segura para permitir filtros arbitrarios
                    const findFirstArgs = args as any;
                    return (context as any).findFirst({
                        ...findFirstArgs,
                        where: {
                            ...findFirstArgs.where,
                            tenant_id: tenantId,
                        },
                    });
                },
            },
        },
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }: any) {
                    const tenantId = getTenantId();
                    const modelName = model?.toLowerCase();

                    // Si no hay tenant o es modelo exento, ejecutar query original
                    if (!tenantId || (modelName && MODELOS_SIN_TENANT.includes(modelName))) {
                        return query(args);
                    }

                    // Inyectar tenant_id en WHERE para operaciones de lectura/actualización masiva
                    if (['findMany', 'findFirst', 'deleteMany', 'updateMany', 'count', 'aggregate'].includes(operation)) {
                        args.where = { ...args.where, tenant_id: tenantId };
                    }

                    // Inyectar tenant_id en DATA para creaciones
                    if (operation === 'create') {
                        args.data = { ...args.data, tenant_id: tenantId };
                    }
                    if (operation === 'createMany') {
                        if (Array.isArray(args.data)) {
                            args.data = args.data.map((item: any) => ({ ...item, tenant_id: tenantId }));
                        } else {
                            args.data = { ...args.data, tenant_id: tenantId };
                        }
                    }

                    // Inyectar tenant_id en UPSERT (caso especial)
                    if (operation === 'upsert') {
                        args.where = { ...args.where, tenant_id: tenantId };
                        args.create = { ...args.create, tenant_id: tenantId };
                        // En update de upsert usualmente no se toca el tenant_id
                    }

                    return query(args);
                },
            },
        },
    });
}
