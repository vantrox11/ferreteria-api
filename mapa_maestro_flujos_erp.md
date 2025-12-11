¡Tienes toda la razón! Esa es la **Regla de Trazabilidad** que evita que la caja sea una "caja negra" y permite auditorías claras. Si no está escrita explícitamente, el agente podría poner descripciones genéricas como "Egreso" o "Devolución".

Aquí tienes el **DOCUMENTO MAESTRO FINAL Y CORREGIDO (v2)**. He agregado la **Regla 0.3 (Trazabilidad)** y he actualizado las instrucciones de los módulos para que sea obligatorio cumplirla.

Copia y pega este bloque definitivo:

***

# 📘 DOCUMENTO MAESTRO DE LÓGICA DE NEGOCIO Y FLUJOS (FASE 2)
**Módulos:** Ventas, Notas de Crédito, Guías de Remisión y Tesorería Automática.
**Contexto:** ERP de Ferretería Multi-tenant (B2B/B2C).

---

## 🟢 0. PREMISAS FUNDAMENTALES (Candados del Sistema)

1.  **Integridad Fiscal (El Candado SUNAT):**
    * **Regla:** Ningún documento posterior (Nota de Crédito o Guía de Remisión) puede crearse si la Venta original tiene `estado_sunat` en `PENDIENTE`, `RECHAZADO` o `ERROR`.
    * **UI:** Los botones "Emitir Nota de Crédito" y "Generar Guía" deben estar **deshabilitados** hasta que `estado_sunat === 'ACEPTADO'`.

2.  **Integridad de Datos (Origen):**
    * Una Nota de Crédito **NUNCA** inventa precios ni productos.
    * **Regla:** Los datos (items, precios unitarios, IGV) deben ser **leídos** directamente de la tabla `VentaDetalles` de la venta origen.

3.  **Trazabilidad Financiera (Obligatorio):**
    * **Regla:** Todo registro en `MovimientosCaja` (sea Automático o Manual) debe incluir **obligatoriamente** la referencia al documento de origen en el campo `descripcion`.
    * **Formato Estándar:** `"{Tipo Acción} por emisión de {Documento} {Serie}-{Numero}"`.
    * *Ejemplo:* `"Devolución automática por emisión de NC01-0045"`.
    * *Prohibido:* Usar descripciones vagas como "Devolución" o "Egreso varios".

---

## 1. FLUJOS DE VENTA (Origen y Corrección Fiscal)

Debemos corregir la lógica de creación de venta para respetar la naturaleza tributaria sobre la financiera.

### A. Lógica de "Condición de Pago" (FIX URGENTE)
Se elimina la regla de conversión automática.
* **Si el usuario elige `CRÉDITO`:** La venta se guarda como `CREDITO` aunque el cliente pague el 100% en ese instante (Amortización Anticipada).
    * *Acción BD:* Se crea `Venta`, se crea `CuentaPorCobrar` (con estado `PAGADA` si cubrió todo) y se crea `Pagos` (Referenciando a la venta).
* **Si el usuario elige `CONTADO`:** La venta se guarda como `CONTADO`.
    * *Acción BD:* Se crea `Venta` y `MovimientoCaja` (Ingreso). **NO** se crea `CuentaPorCobrar`.
    * *Descripción Caja:* `"Ingreso por Venta {Serie}-{Numero}"`.

---

## 2. NOTAS DE CRÉDITO: Lógica Financiera y de Stock

El sistema debe manejar la dualidad: **¿Ajusto una Deuda (Virtual)?** o **¿Devuelvo Dinero (Real)?**.

### Lógica del "Egreso Automático" (El Checkbox)
Para Notas de Crédito que implican devolución de dinero (Ventas al CONTADO o CRÉDITO totalmente amortizado), implementa esta lógica en el Backend:

1.  **Frontend (Modal):** Incluir un checkbox `generar_egreso_caja` (Default: `true`).
2.  **Backend:**
    * Si es `true`: Crea la NC + Retorna Stock + **Crea MovimientoCaja (Egreso)** automáticamente.
        * **Validación Crítica:** Verifica si `saldo_caja >= monto_devolucion`. Si no alcanza, lanza error bloqueante.
        * **Descripción Obligatoria:** `"Devolución automática por emisión de Nota de Crédito {serie}-{numero}"`.
    * Si es `false`: Crea NC + Retorna Stock. **NO toca la caja**. (El dinero se gestiona manualmente después).

---

### DETALLE POR TIPO DE NOTA DE CRÉDITO

#### A. Tipo 07: DEVOLUCIÓN TOTAL
* **Escenario:** Cliente devuelve todo.
* **Inventario:** Reingreso Total (`+`).
* **Finanzas (Depende del Origen):**
    * *Si era CRÉDITO PENDIENTE:* Anula la `CuentaPorCobrar` (Estado: `CANCELADA`, Saldo: 0).
    * *Si era CONTADO (o Crédito Pagado):* **Aplica Lógica de Egreso Automático** por el total.
* **Bloqueo:** La venta queda "Muerta". No admite más NCs ni Guías.

#### B. Tipo 07: DEVOLUCIÓN PARCIAL
* **Escenario:** Cliente devuelve items específicos.
* **Inventario:** Reingreso Parcial (`+` solo items seleccionados).
* **Finanzas:**
    * *Si era CRÉDITO PENDIENTE:* Reduce el `monto_total` de la `CuentaPorCobrar`.
    * *Si era CONTADO:* **Aplica Lógica de Egreso Automático** por el valor de los items devueltos.

#### C. Tipo 01: ANULACIÓN DE LA OPERACIÓN
* **Escenario:** Error administrativo grave.
* **Inventario:** Reingreso Total (`+`).
* **Finanzas:**
    * *Si era CRÉDITO:* Extingue la deuda.
    * *Si era CONTADO:* **Aplica Lógica de Egreso Automático** por el total.
* **Bloqueo:** Venta muerta.

#### D. Tipo 08: DESCUENTO GLOBAL
* **Escenario:** Incentivo comercial retroactivo.
* **Inventario:** **INTACTO** (No mueve stock).
* **Finanzas:**
    * *Si era CRÉDITO:* Reduce la deuda por el monto del descuento.
    * *Si era CONTADO:* **Aplica Lógica de Egreso Automático** (Se asume devolución de efectivo por el monto del descuento).

#### E. Tipo 03: CORRECCIÓN POR ERROR EN DESCRIPCIÓN
* **Escenario:** Corrección de glosa.
* **Inventario:** **INTACTO**.
* **Finanzas:** **INTACTO**.
* **Acción:** Solo genera el XML con la corrección para SUNAT.

---

## 3. GUÍAS DE REMISIÓN (Logística)

La Guía justifica el traslado físico.
* **Validación:**
    * Si la venta tiene NC de Anulación (Tipo 01) o Devolución Total (Tipo 07) -> **BLOQUEAR** emisión de Guía.
    * En los demás casos -> **PERMITIR**.
* **Datos:** No muestra precios, solo Pesos y Bultos.

---

## 4. MATRIZ DE REGLAS DE NEGOCIO (Validaciones Cruzadas)

| Estado Actual Venta | ¿Permite Nueva NC? | Tipos Permitidos | ¿Permite Guía (GRE)? |
| :--- | :--- | :--- | :--- |
| **Limpia (Sin NCs)** | ✅ SÍ | Todos | ✅ SÍ |
| **Con NC Anulación (01)** | ⛔ NO | Ninguno | ⛔ NO |
| **Con NC Dev. Total (07)** | ⛔ NO | Ninguno | ⛔ NO |
| **Con NC Dev. Parcial** | ✅ SÍ | Parcial, Descuento, Corrección (Hasta agotar saldo/stock) | ✅ SÍ (Por saldo) |
| **Con NC Descuento Global**| ✅ SÍ | Todos | ✅ SÍ |
| **Con NC Corrección (03)** | ✅ SÍ | Todos | ✅ SÍ |

## 🔴 5. REGLAS ECONÓMICAS Y DE STOCK (Detalle Fino)
**Tope de Devolución**

El backend validará matemáticamente que Σ(Notas Crédito Aprobadas) + Nota Crédito Actual <= Total Venta Original. Si se excede por 0.01, se bloquea la operación.

**Valuación de Reingreso (Kardex)**

Al procesar una NC Tipo 07 (Devolución), el sistema buscará el costo_unitario que tuvo el producto en el momento de la venta original (tabla MovimientosInventario original o DetalleVenta) y usará ese mismo valor para valorar la entrada (ENTRADA_DEVOLUCION). Esto anula el impacto en la utilidad bruta correctamente.