import { AsyncLocalStorage } from 'async_hooks';

interface TenantStore {
    tenantId: number;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function setTenantId(tenantId: number): void {
    const store = tenantStorage.getStore();
    if (store) {
        store.tenantId = tenantId;
    }
}

export function getTenantId(): number | undefined {
    return tenantStorage.getStore()?.tenantId;
}

export function requireTenantId(): number {
    const tenantId = getTenantId();
    if (tenantId === undefined) {
        throw new Error('TenantContext: No hay tenant_id en el contexto actual (Fuga de contexto).');
    }
    return tenantId;
}

export function runWithTenant<T>(tenantId: number, fn: () => T): T {
    return tenantStorage.run({ tenantId }, fn);
}
