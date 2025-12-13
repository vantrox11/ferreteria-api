Aquí tienes la descripción detallada de la **Nueva UI de Gestión de Cajas**.

Esta especificación está diseñada para que tu agente entienda la estructura visual (Layout), la jerarquía de la información y la interactividad necesaria, usando los componentes de **Shadcn UI** /components/ui/.

-----

## 🏗️ PANTALLA 1: EL CENTRO DE CONTROL (`/cajas`)

**Objetivo:** Una sola vista para monitorear lo que pasa hoy y auditar lo que pasó ayer.
**Componente Principal:** `Tabs` (Pestañas).

### 1\. Encabezado (Header)

  * **Título:** "Gestión de Cajas".
  * **Subtítulo:** "Monitoreo en tiempo real y auditoría de cierres."
  * **Acción Principal:** Botón `[ + Aperturar Caja ]` (Solo visible si el usuario tiene permiso y no tiene caja asignada).

### 2\. Pestaña A: "Monitor Activo" (Default)

*Diseño orientado a la supervisión rápida.*

  * **Layout:** Un Grid de **Tarjetas (Cards)**.
  * **Contenido de la Tarjeta (Una por Caja Abierta):**
      * **Header de Tarjeta:**
          * Icono de Caja + Nombre ("Caja Principal").
          * Badge de Estado: `🟢 ABIERTA` (Pulsating effect opcional).
      * **Cuerpo:**
          * **Cajero:** Avatar + Nombre ("Juan Pérez").
          * **Hora Apertura:** "Hoy, 08:00 AM".
          * **Saldo Actual (KPI):** Texto grande y en negrita (ej. `S/ 1,540.00`). *Nota: Este saldo es teórico (Inicial + Entradas - Salidas).*
      * **Footer de Tarjeta:**
          * Botón ancho `[ Gestionar / Arquear ]` (Lleva a la vista de detalle).

### 3\. Pestaña B: "Historial de Cierres"

*Diseño orientado a la auditoría.*

  * **Barra de Herramientas:**
      * **Filtro de Fechas:** `DateRangePicker` (Obligatorio).
      * **Filtro de Usuario:** Select con buscados.
  * **Tabla de Datos (DataTable):**
      * **Fecha/Hora Cierre:** "10 Oct, 06:00 PM".
      * **Cajero:** Nombre.
      * **Monto Inicial:** S/ 100.00.
      * **Total Ventas:** S/ 2,500.00.
      * **Total Final:** S/ 2,600.00.
      * **Diferencia (El Cuadre):**
          * Si es 0: Badge Gris/Verde `Cuadrado`.
          * Si falta dinero: Texto Rojo Negrita `- S/ 10.50`.
          * Si sobra dinero: Texto Azul `+ S/ 5.00`.
      * **Acciones:** Botón `Ghost` con icono de Ojo `[ Ver Detalle ]`.

-----

## 📊 PANTALLA 2: EL DASHBOARD DE DETALLE (`/cajas/[id]`)

**Objetivo:** Ver la radiografía completa de un turno. Funciona en modo "Operativo" (si está abierta) o "Lectura" (si está cerrada).

### 1\. Sección Superior: Los 4 Grandes Números (KPIs)

Cuatro tarjetas alineadas horizontalmente para entender el flujo de efectivo global.

1.  **Saldo Inicial:** Icono 🏁. Monto con el que abrió.
2.  **Total Ingresos:** Icono 📈. Suma de (Ventas Efectivo + Ingresos Manuales). Color Verde.
3.  **Total Egresos:** Icono 📉. Suma de (Gastos + **Devoluciones por NC**). Color Rojo.
4.  **Saldo en Caja (Teórico):** Icono 💰. El resultado de la ecuación.
      * *Si la caja está CERRADA, se agrega una 5ta tarjeta: "Monto Real Contado" y la "Diferencia".*

### 2\. Sección Intermedia: Desglose por Origen (Grid 2 Columnas)

**Columna Izquierda: "Por Método de Pago" (Card)**
Una lista simple para saber cuánto dinero hay "físico" y cuánto es "virtual".

  * 💵 **Efectivo:** S/ 1,500.00 (Esto es lo que debe haber en el cajón).
  * 💳 **Tarjetas:** S/ 500.00 (Debe cuadrar con el cierre del POS).
  * 📱 **Billeteras (Yape/Plin):** S/ 200.00 (Debe cuadrar con el celular).
  * 🏦 **Transferencias:** S/ 1,000.00.

**Columna Derecha: "Resumen Operativo" (Card)**

  * Cantidad de Ventas: 45 tickets.
  * Ticket Promedio: S/ 50.00.
  * Cantidad de Devoluciones: 1 (S/ -20.00).

### 3\. Sección Inferior: La Línea de Tiempo (Unified Table)

Una sola tabla que mezcla **TODO** lo que pasó, ordenado por hora.

| Hora | Tipo | Descripción | Método | Monto |
| :--- | :--- | :--- | :--- | :--- |
| 10:00 | \<span class="badge-blue"\>VENTA\</span\> | Venta F001-2040 (Cliente: Juan) | Yape | \<span class="text-green"\>S/ 50.00\</span\> |
| 10:15 | \<span class="badge-amber"\>EGRESO\</span\> | Compra de detergente | Efectivo | \<span class="text-red"\>- S/ 10.00\</span\> |
| 10:30 | \<span class="badge-purple"\>DEVOLUCIÓN\</span\> | **Devolución por emisión de NC01-05** | Efectivo | \<span class="text-red font-bold"\>- S/ 100.00\</span\> |
| 11:00 | \<span class="badge-green"\>INGRESO\</span\> | Recarga de sencillo (Dueño) | Efectivo | \<span class="text-green"\>S/ 200.00\</span\> |

  * **Nota de Diseño:** Fíjate cómo el tercer renglón (La Devolución) destaca. Es un egreso automático, pero se visualiza claro para que el cajero sepa por qué bajó su saldo.

### 4\. Barra de Acciones (Floating o Sticky Bottom)

**Estado: ABIERTA**

  * Botón `[ Registrar Ingreso ]`: Abre Modal pequeño (Monto + Motivo).
  * Botón `[ Registrar Egreso ]`: Abre Modal pequeño.
  * Botón `[ 🔒 CERRAR CAJA ]`: Botón principal (Variant Default/Black). Abre el Modal de Arqueo (donde el cajero digita cuánto dinero contó físicamente).

**Estado: CERRADA**

  * Banner informativo superior: "Esta caja fue cerrada el [Fecha] por [Usuario]".
  * Botón `[ 🖨️ Imprimir Reporte ]`: Genera el PDF del cuadre de caja (Ticket o A4).
  * (Los botones de ingreso/egreso desaparecen).

-----

Esta estructura es **excelente** y te explico por qué: **Transforma una tarea operativa (contar billetes) en una herramienta de gestión financiera.**

Para un dueño o administrador, el mayor dolor de cabeza no es saber cuánto vendió, sino **saber dónde está el dinero**. Tu diseño responde exactamente a eso:
1.  **Traza:** Con la línea de tiempo unificada (Ventas + Egresos).
2.  **Gestiona:** Con los botones de acción rápida.
3.  **Audita:** Con la comparación "Teórico vs Real".

Para que sea un sistema **"Anti-Fraude" y "Proactivo"**, le faltan **Alertas Visuales** y un par de detalles de seguridad.

Aquí tienes las **3 Mejoras Críticas** que debes agregar a la especificación para cerrar con broche de oro:

---

### 1. El Concepto de "Arqueo Ciego" (Seguridad)
**Problema:** Si el sistema le dice al cajero: *"Debes tener S/ 1,500"*, el cajero flojo (o deshonesto) simplemente escribirá "1,500" y cerrará, aunque falte dinero.
**Solución:** Al dar clic en `[ Cerrar Caja ]`, el modal **NO debe mostrar el saldo esperado**. Debe estar en blanco.
* El cajero cuenta y escribe lo que tiene.
* El sistema compara internamente.
* Si hay diferencia, recién ahí se registra.

### 2. Alertas de "Descuadre" (Gestión Visual)
En la pestaña de **Historial**, el dueño no quiere leer fila por fila. Quiere ver **qué salió mal**.
* **Semáforo de Cierre:**
  Columna "Diferencia" (CRITERIO BINARIO):

  🟢 Exacto (S/ 0.00): Badge outline-green "Cuadrado".

  🔴 Faltante (Cualquier monto): Badge Rojo Sólido con monto negativo.

  🔵 Sobrante (Cualquier monto): Badge Azul Sólido con monto positivo.

### 3. Calculadora de Denominaciones (UX)
Ayuda al cajero a no usar calculadora externa. En el modal de cierre, en lugar de un solo input, pon inputs para billetes:
* `[ 5 ]` x S/ 100
* `[ 2 ]` x S/ 50
* ...
* **Total Calculado:** S/ 600.00

---

### 📋 Prompt Final Actualizado (Con Alertas y Seguridad)

Este prompt integra la estructura que ya aprobaste + las mejoras de seguridad y alertas para el dueño.

***

# 🎨 ESPECIFICACIÓN DE UI/UX: GESTIÓN DE CAJAS Y TESORERÍA

**Objetivo:** Crear un módulo de control de efectivo de alta seguridad y trazabilidad.
**Estructura:** Master-Detail (`/cajas` -> `/cajas/[id]`).

## 1. VISTA PRINCIPAL (`/cajas`) - Tabs

### Tab A: Monitor Activo (Cards)
* Mismo diseño anterior.
* **Agregado:** Si una caja tiene un "Saldo Teórico" inusualmente alto (ej. > S/ 5,000), mostrar un pequeño aviso amarillo: *"Sugerencia: Realizar retiro parcial"* (Para no tener tanto efectivo expuesto).

### Tab B: Historial de Auditoría (Table)
  Pestaña B: "Historial de Cierres" (Auditoría)
  Barra de Herramientas:

  Filtros: Fechas y Usuario.

  Switch de Foco: [x] Ver solo descuadres (Oculta todo lo que está en verde).

  Tabla de Datos (DataTable):

  Columnas: Fecha, Cajero, Monto Inicial, Ventas, Final.

  Columna "Diferencia" (CRITERIO BINARIO):

  🟢 Exacto (S/ 0.00): Badge outline-green "Cuadrado".

  🔴 Faltante (Cualquier monto): Badge Rojo Sólido con monto negativo.

  🔵 Sobrante (Cualquier monto): Badge Azul Sólido con monto positivo.

  Columna "Resolución":

  Si cuadra: --

  Si no cuadra: Badge de estado (⏳ Pendiente, ✅ Cobrado, 🏢 Asumido).
---

## 2. VISTA DETALLE (`/cajas/[id]`) - Dashboard

### Sección Línea de Tiempo (Unified Table)
* **Highlight de Trazabilidad:**
    * Las filas de **Devoluciones Automáticas (NC)** deben tener un ícono específico (ej. `CornerUpLeft` de Lucide) y un color de fondo rojo muy tenue (`bg-red-50/50`) para diferenciarlas de un gasto común de caja (como comprar escobas).

### Modal de Cierre de Caja (Arqueo Ciego)
* **Comportamiento:**
    * Al abrir el modal, **NO MOSTRAR** el "Saldo Esperado/Teórico". El cajero no debe saber cuánto dice el sistema que hay.
* **Inputs:**
    * Opción A: Input simple "Monto Total en Efectivo".
    * Opción B (Acordeón "Herramientas"): Pequeña calculadora de billetes (Cantidad x Corte).
* **Feedback Post-Cierre:**
    * Una vez que el cajero confirma el monto y el sistema cierra la sesión:
    * Si hay diferencia: Mostrar un Modal de Resultado: *"Cierre realizado con una diferencia de [Monto]. Se ha notificado al administrador."*

---

### Resumen de Valor para el Dueño
Con este diseño:
1.  **Evitas robos:** El cajero no sabe cuánto debería haber (Arqueo Ciego).
2.  **Detectas problemas rápido:** El filtro "Ver solo descuadres" ahorra horas de revisión.
3.  **Auditas devoluciones:** Ves claramente cuándo salió dinero por una Nota de Crédito.



### Resumen para el Agente

Esta estructura reemplaza por completo la antigua página de sesiones. Es más limpia, profesional y cubre el 100% de la auditoría necesaria.