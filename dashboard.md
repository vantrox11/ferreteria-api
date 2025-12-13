
# ESPECIFICACIÓN MAESTRA DE DASHBOARDS (Versión Optimizada para SaaS Líder)

### 1\. DASHBOARD GENERAL (La Torre de Control / Visión CEO)

**Objetivo:** Responder en 5 segundos a la pregunta: *"¿Mi negocio está sano hoy?"*. Prioriza la seguridad del efectivo y la rentabilidad real.

#### A. Fila Superior: Los Signos Vitales (Tarjetas KPI)

*Formato:* Valor actual + Flecha comparativa (vs. periodo anterior).

1.  **Liquidez Desglosada (El Semáforo del Dinero):**
      * *Visual:* Dos sub-valores en la misma tarjeta.
      * **A. En Caja (Riesgo):** Suma actual de `monto_final` (calculado) de todas las `SesionesCaja` con estado `ABIERTA`.
          * *Insight:* "Hay S/ 5,000 en los cajones ahora mismo. ¿Debo hacer un retiro parcial para evitar robos?".
      * **B. Disponible Total:** Suma de Cierres Acumulados + Bancos (si aplica).
          * *Insight:* Capacidad real de pago a proveedores.
2.  **Utilidad Bruta Real (Blindada contra inflación):**
      * *Dato:* `Σ ((VentaDetalles.precio_unitario - VentaDetalles.costo_historico) * cantidad)`.
      * *Requisito Técnico Crítico:* Usar el campo `costo_unitario` snapshot en `VentaDetalles` (ver sección técnica abajo) en lugar del costo actual del producto, para que el reporte sea contablemente exacto.
      * *Por qué:* Muestra cuánto dinero limpio ganaste realmente, respetando el costo al que compraste la mercadería en su momento.
3.  **Cuentas por Cobrar (CxC) Vencidas:**
      * *Dato:* Suma de `saldo_pendiente` en `CuentasPorCobrar` donde `fecha_vencimiento < hoy`.
      * *Por qué:* Dinero que ya debería estar en tu bolsillo. Alerta de gestión de cobradores.
4.  **Valor del Inventario (Capital Inmovilizado):**
      * *Dato:* `Σ (Producto.stock * Producto.costo_compra_actual)`.
      * *Por qué:* Muestra cuánto dinero tienes "congelado" en el almacén.

#### B. Zona Central: Tendencias y Flujo

5.  **Gráfico de Flujo de Caja (Ingresos vs. Egresos):**
      * *Visual:* Barras agrupadas (Últimos 30 días).
      * *Dato:* `MovimientosCaja(INGRESO)` vs `MovimientosCaja(EGRESO)`.
      * *Insight:* Detecta días donde la operación "quema" dinero (ej: días de pago de planilla o alquiler).
6.  **Ticket Promedio (Evolución):**
      * *Visual:* Gráfico de línea.
      * *Insight:* Mide la eficacia del *up-selling* en mostrador.

#### C. Zona Inferior: Alertas Críticas (Gestión por Excepción)

7.  **Semáforo de Quiebre Inminente (Forecasting):**
      * *Mejora:* No usar stock mínimo estático.
      * *Lógica:* Listar productos donde `Stock Actual / Velocidad de Venta Diaria < 7 días`.
      * *Mensaje:* "El Cemento Sol se agotará en **3 días** al ritmo actual".
      * *Acción:* Botón "Reponer".
8.  **Top Deudores (Lista Negra):**
      * *Visual:* Top 5 Clientes con mayor deuda vencida.

-----

### 2\. DASHBOARD DE VENTAS (El Motor Comercial / Visión Gerente)

**Objetivo:** Optimización y Estrategia. Entender la diferencia entre **Volumen** (tráfico) y **Valor** (ganancia).

#### A. Fila Superior: Rendimiento Táctico

1.  **Ventas Totales Netas:** Dinero facturado.
2.  **Margen Promedio %:** Salud de la lista de precios.
3.  **Tasa de Recurrencia (Fidelización de Contratistas):** *[NUEVO]*
      * *Dato:* `% de Ventas a Clientes Recurrentes` (que compraron en los últimos 90 días) vs. `Clientes Nuevos/Anónimos`.
      * *Por qué:* Una ferretería vive de que el maestro de obra regrese. Si esto baja, pierdes tu base.
4.  **Tasa de Devoluciones:** Calidad de venta.

#### B. Zona Central: El "Pareto Real" (Rotación vs Rentabilidad)

*En lugar de una sola tabla, dividimos la visión:*

5.  **Top Rotación (Los que traen gente):**
      * *Ordenado por:* Cantidad de unidades vendidas.
      * *Ejemplo:* Cemento, Fierros, Lijas.
      * *Insight:* Estos productos pagan la luz y traen tráfico. Nunca pueden faltar, aunque dejen poco margen.
6.  **Top Rentabilidad (Los que dejan dinero):**
      * *Ordenado por:* `(Precio - Costo Histórico) * Cantidad`.
      * *Ejemplo:* Grifería, Accesorios eléctricos, Pinturas premium.
      * *Insight:* Aquí es donde el negocio gana dinero real. Hay que empujar estos productos en mostrador.

#### C. Zona Inferior: Gestión del Equipo

7.  **Ranking de Vendedores (Enfoque Utilidad):**
      * *Columnas:* Nombre | Ventas Totales (S/) | **Utilidad Generada (S/)**.
      * *Cambio Clave:* Ordenar por **Utilidad**, no por venta total. Premia al vendedor que defiende el precio y vende productos rentables, no al que revienta el precio del cemento con descuentos.
8.  **Mapa de Calor (Horario):** Identificación de horas punta para gestión de personal.

-----

### 🟢 El "Toque Secreto" (Diferenciadores Técnicos)

1.  **Indicador "Efectivo vs. Crédito":**
      * Gráfico de pastel. Si el crédito supera el 40-50%, mostrar alerta de "Riesgo de Liquidez" (Vendes mucho pero cobras poco).
2.  **Proyección Inteligente:**
      * Usa la tabla `MovimientosInventario` (tipo `SALIDA_VENTA`) para calcular la velocidad de consumo real y predecir fechas de agotamiento.

-----

### 🛠️ HOJA DE RUTA TÉCNICA (Backend Implementation)

Para lograr esto con tu arquitectura actual, debes aplicar estos cambios técnicos obligatorios:

#### 1\. Modificación de Base de Datos (Migration)

Es imperativo para el cálculo de "Utilidad Bruta" y "Top Rentabilidad".

```prisma
// En tu archivo schema.prisma
model VentaDetalles {
  // ... campos actuales
  precio_unitario Decimal @db.Decimal(12, 4)
  
  // AGREGAR ESTE CAMPO
  costo_unitario  Decimal @db.Decimal(12, 4) // Snapshot del costo promedio al momento de la venta
}
```

*Lógica:* Al crear la venta (`ventas.service.ts`), debes leer el `costo_promedio` actual del inventario y guardarlo aquí.

#### 2\. Estrategia de Endpoints (Performance)

No mates al servidor con una sola llamada gigante. Divide y vencerás en `dashboard.controller.ts`:

  * `GET /api/dashboard/kpis`: Consultas ligeras (`count`, `sum`) para las tarjetas superiores. Respuesta \< 200ms.
  * `GET /api/dashboard/charts`: Consultas pesadas con `groupBy` y rangos de fechas para los gráficos centrales. Carga asíncrona (Skeleton en frontend).
  * `GET /api/dashboard/alerts`: Consultas específicas de inventario y deuda para la zona inferior.

#### 3\. Uso de Prisma Aggregations

Para los KPIs, usa la potencia de la BD, no calcules en JS.

```typescript
// Ejemplo: Obtener Top Rentabilidad
const topRentabilidad = await db.ventaDetalles.groupBy({
  by: ['producto_id'],
  _sum: {
    cantidad: true,
  },
  // Nota: Prisma no permite aritmética compleja en groupBy directos a veces, 
  // si se complica, usa $queryRaw para esta consulta específica:
  // SELECT producto_id, SUM((precio_unitario - costo_unitario) * cantidad) as utilidad ...
  take: 5,
});
```

Esta estructura convierte tu ERP en una herramienta de **inteligencia de negocios**, no solo en un registro de operaciones.