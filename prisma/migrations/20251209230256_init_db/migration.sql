-- CreateTable
CREATE TABLE `UnidadesMedida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `permite_decimales` BOOLEAN NOT NULL DEFAULT false,
    `tenant_id` INTEGER NOT NULL,

    UNIQUE INDEX `UnidadesMedida_tenant_id_codigo_key`(`tenant_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Marcas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `logo_url` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tenant_id` INTEGER NOT NULL,

    UNIQUE INDEX `Marcas_tenant_id_nombre_key`(`tenant_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_empresa` VARCHAR(191) NOT NULL,
    `subdominio` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `configuracion` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tenants_subdominio_key`(`subdominio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NULL,
    `rol` ENUM('admin', 'empleado') NOT NULL DEFAULT 'empleado',
    `tenant_id` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Usuarios_tenant_id_email_key`(`tenant_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `tenant_id` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Categorias_tenant_id_nombre_key`(`tenant_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Productos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `descripcion` VARCHAR(191) NULL,
    `costo_compra` DECIMAL(12, 4) NULL,
    `stock` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `stock_minimo` INTEGER NOT NULL DEFAULT 5,
    `tenant_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `marca_id` INTEGER NULL,
    `unidad_medida_id` INTEGER NOT NULL,
    `afectacion_igv` ENUM('GRAVADO', 'EXONERADO', 'INAFECTO') NOT NULL DEFAULT 'GRAVADO',
    `precio_base` DECIMAL(12, 4) NOT NULL,
    `imagen_url` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Productos_categoria_id_idx`(`categoria_id`),
    INDEX `Productos_marca_id_idx`(`marca_id`),
    INDEX `Productos_unidad_medida_id_idx`(`unidad_medida_id`),
    UNIQUE INDEX `Productos_tenant_id_sku_key`(`tenant_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientosInventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `tipo_movimiento` ENUM('ENTRADA_COMPRA', 'SALIDA_VENTA', 'ENTRADA_AJUSTE', 'SALIDA_AJUSTE', 'ENTRADA_DEVOLUCION', 'SALIDA_DEVOLUCION') NOT NULL,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `saldo_anterior` DECIMAL(12, 3) NOT NULL,
    `saldo_nuevo` DECIMAL(12, 3) NOT NULL,
    `costo_unitario` DECIMAL(12, 4) NULL,
    `venta_id` INTEGER NULL,
    `orden_compra_id` INTEGER NULL,
    `nota_credito_id` INTEGER NULL,
    `ajuste_manual` BOOLEAN NOT NULL DEFAULT false,
    `motivo` TEXT NULL,
    `tenant_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimientosInventario_producto_id_created_at_idx`(`producto_id`, `created_at`),
    INDEX `MovimientosInventario_tenant_id_idx`(`tenant_id`),
    INDEX `MovimientosInventario_venta_id_idx`(`venta_id`),
    INDEX `MovimientosInventario_orden_compra_id_idx`(`orden_compra_id`),
    INDEX `MovimientosInventario_nota_credito_id_idx`(`nota_credito_id`),
    INDEX `MovimientosInventario_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proveedores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `ruc_identidad` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `tenant_id` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tipo_documento` ENUM('RUC', 'DNI', 'CE') NOT NULL DEFAULT 'RUC',
    `deletedAt` DATETIME(3) NULL,

    INDEX `Proveedores_tipo_documento_idx`(`tipo_documento`),
    UNIQUE INDEX `Proveedores_tenant_id_ruc_identidad_key`(`tenant_id`, `ruc_identidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrdenesCompra` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `total` DECIMAL(65, 30) NULL,
    `estado` ENUM('pendiente', 'recibida', 'cancelada') NOT NULL DEFAULT 'pendiente',
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_recepcion` DATETIME(3) NULL,
    `tenant_id` INTEGER NOT NULL,
    `proveedor_id` INTEGER NULL,
    `usuario_id` INTEGER NULL,
    `fecha_contable` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_emision` DATETIME(3) NULL,
    `impuesto_igv` DECIMAL(12, 2) NULL,
    `numero` VARCHAR(191) NULL,
    `proveedor_ruc` VARCHAR(191) NULL,
    `serie` VARCHAR(191) NULL,
    `subtotal_base` DECIMAL(12, 2) NULL,
    `tipo_comprobante` VARCHAR(191) NULL,

    INDEX `OrdenesCompra_tenant_id_idx`(`tenant_id`),
    INDEX `OrdenesCompra_proveedor_id_idx`(`proveedor_id`),
    INDEX `OrdenesCompra_usuario_id_idx`(`usuario_id`),
    INDEX `OrdenesCompra_tipo_comprobante_idx`(`tipo_comprobante`),
    INDEX `OrdenesCompra_fecha_emision_idx`(`fecha_emision`),
    UNIQUE INDEX `OrdenesCompra_serie_numero_proveedor_ruc_tenant_id_key`(`serie`, `numero`, `proveedor_ruc`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrdenCompraDetalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `costo_unitario` DECIMAL(65, 30) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `orden_compra_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `costo_unitario_base` DECIMAL(12, 4) NULL,
    `costo_unitario_total` DECIMAL(12, 4) NULL,
    `igv_linea` DECIMAL(12, 2) NULL,
    `tasa_igv` DECIMAL(5, 2) NULL DEFAULT 18.00,

    INDEX `OrdenCompraDetalles_tenant_id_idx`(`tenant_id`),
    INDEX `OrdenCompraDetalles_orden_compra_id_idx`(`orden_compra_id`),
    INDEX `OrdenCompraDetalles_producto_id_idx`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Clientes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `documento_identidad` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `tenant_id` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `razon_social` VARCHAR(191) NULL,
    `ruc` VARCHAR(191) NULL,
    `dias_credito` INTEGER NOT NULL DEFAULT 0,
    `limite_credito` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Clientes_ruc_idx`(`ruc`),
    UNIQUE INDEX `Clientes_tenant_id_documento_identidad_key`(`tenant_id`, `documento_identidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ventas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `total` DECIMAL(12, 2) NOT NULL,
    `metodo_pago` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenant_id` INTEGER NOT NULL,
    `cliente_id` INTEGER NULL,
    `usuario_id` INTEGER NULL,
    `pedido_origen_id` INTEGER NULL,
    `numero_comprobante` INTEGER NULL,
    `serie_id` INTEGER NULL,
    `sesion_caja_id` INTEGER NULL,
    `condicion_pago` ENUM('CONTADO', 'CREDITO') NOT NULL DEFAULT 'CONTADO',
    `estado_pago` ENUM('PENDIENTE', 'PARCIAL', 'PAGADO') NOT NULL DEFAULT 'PAGADO',
    `fecha_vencimiento` DATETIME(3) NULL,
    `monto_pagado` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `saldo_pendiente` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `cdr_url` VARCHAR(191) NULL,
    `codigo_qr` TEXT NULL,
    `estado_sunat` ENUM('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO') NULL DEFAULT 'PENDIENTE',
    `hash_cpe` VARCHAR(191) NULL,
    `referencia_pago` VARCHAR(191) NULL,
    `xml_url` VARCHAR(191) NULL,

    UNIQUE INDEX `Ventas_pedido_origen_id_key`(`pedido_origen_id`),
    INDEX `Ventas_tenant_id_idx`(`tenant_id`),
    INDEX `Ventas_cliente_id_idx`(`cliente_id`),
    INDEX `Ventas_usuario_id_idx`(`usuario_id`),
    INDEX `Ventas_pedido_origen_id_idx`(`pedido_origen_id`),
    INDEX `Ventas_sesion_caja_id_idx`(`sesion_caja_id`),
    INDEX `Ventas_serie_id_idx`(`serie_id`),
    UNIQUE INDEX `Ventas_serie_id_numero_comprobante_tenant_id_key`(`serie_id`, `numero_comprobante`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VentaDetalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `precio_unitario` DECIMAL(12, 4) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `venta_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `igv_total` DECIMAL(12, 4) NOT NULL,
    `tasa_igv` DECIMAL(5, 4) NOT NULL,
    `valor_unitario` DECIMAL(12, 4) NOT NULL,

    INDEX `VentaDetalles_venta_id_idx`(`venta_id`),
    INDEX `VentaDetalles_producto_id_idx`(`producto_id`),
    INDEX `VentaDetalles_tenant_id_venta_id_idx`(`tenant_id`, `venta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('pendiente', 'confirmado', 'cancelado', 'entregado') NOT NULL DEFAULT 'pendiente',
    `tipo_recojo` ENUM('tienda', 'envio') NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `cliente_id` INTEGER NULL,
    `usuario_gestion_id` INTEGER NULL,

    INDEX `Pedidos_tenant_id_idx`(`tenant_id`),
    INDEX `Pedidos_cliente_id_idx`(`cliente_id`),
    INDEX `Pedidos_usuario_gestion_id_idx`(`usuario_gestion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PedidoDetalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `pedido_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,

    INDEX `PedidoDetalles_tenant_id_idx`(`tenant_id`),
    INDEX `PedidoDetalles_pedido_id_idx`(`pedido_id`),
    INDEX `PedidoDetalles_producto_id_idx`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cajas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tenant_id` INTEGER NOT NULL,

    UNIQUE INDEX `Cajas_tenant_id_nombre_key`(`tenant_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SesionesCaja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_apertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_cierre` DATETIME(3) NULL,
    `monto_inicial` DECIMAL(12, 2) NOT NULL,
    `monto_final` DECIMAL(12, 2) NULL,
    `total_ventas` DECIMAL(12, 2) NULL,
    `total_ingresos` DECIMAL(12, 2) NULL,
    `total_egresos` DECIMAL(12, 2) NULL,
    `diferencia` DECIMAL(12, 2) NULL,
    `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
    `tenant_id` INTEGER NOT NULL,
    `caja_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,

    INDEX `SesionesCaja_tenant_id_idx`(`tenant_id`),
    INDEX `SesionesCaja_caja_id_idx`(`caja_id`),
    INDEX `SesionesCaja_usuario_id_idx`(`usuario_id`),
    INDEX `SesionesCaja_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientosCaja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('INGRESO', 'EGRESO') NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `venta_id` INTEGER NULL,
    `nota_credito_id` INTEGER NULL,
    `pago_id` INTEGER NULL,
    `es_manual` BOOLEAN NOT NULL DEFAULT false,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenant_id` INTEGER NOT NULL,
    `sesion_caja_id` INTEGER NOT NULL,

    INDEX `MovimientosCaja_tenant_id_idx`(`tenant_id`),
    INDEX `MovimientosCaja_sesion_caja_id_idx`(`sesion_caja_id`),
    INDEX `MovimientosCaja_venta_id_idx`(`venta_id`),
    INDEX `MovimientosCaja_nota_credito_id_idx`(`nota_credito_id`),
    INDEX `MovimientosCaja_pago_id_idx`(`pago_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Series` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo_comprobante` ENUM('FACTURA', 'BOLETA', 'NOTA_VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION') NOT NULL,
    `correlativo_actual` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tenant_id` INTEGER NOT NULL,
    `caja_id` INTEGER NULL,

    INDEX `Series_caja_id_idx`(`caja_id`),
    INDEX `Series_tipo_comprobante_idx`(`tipo_comprobante`),
    UNIQUE INDEX `Series_tenant_id_codigo_key`(`tenant_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditoriaLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `accion` ENUM('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'ANULAR', 'AJUSTAR', 'LOGIN', 'LOGOUT') NOT NULL,
    `tabla_afectada` VARCHAR(191) NOT NULL,
    `registro_id` INTEGER NULL,
    `datos_antes` JSON NULL,
    `datos_despues` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenant_id` INTEGER NOT NULL,

    INDEX `AuditoriaLogs_tenant_id_idx`(`tenant_id`),
    INDEX `AuditoriaLogs_usuario_id_idx`(`usuario_id`),
    INDEX `AuditoriaLogs_accion_idx`(`accion`),
    INDEX `AuditoriaLogs_tabla_afectada_idx`(`tabla_afectada`),
    INDEX `AuditoriaLogs_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuentasPorCobrar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `monto_total` DECIMAL(12, 2) NOT NULL,
    `monto_pagado` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `saldo_pendiente` DECIMAL(12, 2) NOT NULL,
    `estado` ENUM('VIGENTE', 'POR_VENCER', 'VENCIDA', 'PAGADA', 'CANCELADA') NOT NULL DEFAULT 'VIGENTE',
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_vencimiento` DATETIME(3) NOT NULL,
    `fecha_ultimo_pago` DATETIME(3) NULL,
    `notas` TEXT NULL,
    `tenant_id` INTEGER NOT NULL,
    `venta_id` INTEGER NOT NULL,
    `cliente_id` INTEGER NOT NULL,

    UNIQUE INDEX `CuentasPorCobrar_venta_id_key`(`venta_id`),
    INDEX `CuentasPorCobrar_cliente_id_idx`(`cliente_id`),
    INDEX `CuentasPorCobrar_estado_idx`(`estado`),
    INDEX `CuentasPorCobrar_fecha_vencimiento_idx`(`fecha_vencimiento`),
    INDEX `CuentasPorCobrar_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuiaRemisionDetalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `guia_remision_id` INTEGER NOT NULL,

    INDEX `GuiaRemisionDetalles_guia_remision_id_idx`(`guia_remision_id`),
    INDEX `GuiaRemisionDetalles_producto_id_idx`(`producto_id`),
    INDEX `GuiaRemisionDetalles_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuiasRemision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serie_id` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `motivo_traslado` ENUM('VENTA', 'COMPRA', 'TRASLADO_ENTRE_ESTABLECIMIENTOS', 'OTROS') NOT NULL,
    `descripcion_motivo` TEXT NULL,
    `peso_bruto_total` DECIMAL(12, 2) NOT NULL,
    `numero_bultos` INTEGER NOT NULL,
    `direccion_partida` TEXT NOT NULL,
    `ubigeo_partida` VARCHAR(191) NULL,
    `direccion_llegada` TEXT NOT NULL,
    `ubigeo_llegada` VARCHAR(191) NULL,
    `modalidad_transporte` VARCHAR(191) NOT NULL DEFAULT 'PRIVADO',
    `ruc_transportista` VARCHAR(191) NULL,
    `razon_social_transportista` VARCHAR(191) NULL,
    `placa_vehiculo` VARCHAR(191) NULL,
    `licencia_conducir` VARCHAR(191) NULL,
    `nombre_conductor` VARCHAR(191) NULL,
    `estado_sunat` ENUM('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO') NULL DEFAULT 'PENDIENTE',
    `xml_url` VARCHAR(191) NULL,
    `cdr_url` VARCHAR(191) NULL,
    `hash_cpe` VARCHAR(191) NULL,
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_inicio_traslado` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenant_id` INTEGER NOT NULL,
    `venta_id` INTEGER NULL,
    `usuario_id` INTEGER NULL,

    INDEX `GuiasRemision_estado_sunat_idx`(`estado_sunat`),
    INDEX `GuiasRemision_fecha_emision_idx`(`fecha_emision`),
    INDEX `GuiasRemision_serie_id_idx`(`serie_id`),
    INDEX `GuiasRemision_tenant_id_idx`(`tenant_id`),
    INDEX `GuiasRemision_usuario_id_fkey`(`usuario_id`),
    INDEX `GuiasRemision_venta_id_idx`(`venta_id`),
    UNIQUE INDEX `GuiasRemision_serie_id_numero_tenant_id_key`(`serie_id`, `numero`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotaCreditoDetalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `valor_unitario` DECIMAL(12, 4) NOT NULL,
    `precio_unitario` DECIMAL(12, 4) NOT NULL,
    `igv_total` DECIMAL(12, 4) NOT NULL,
    `tasa_igv` DECIMAL(5, 4) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `nota_credito_id` INTEGER NOT NULL,

    INDEX `NotaCreditoDetalles_nota_credito_id_idx`(`nota_credito_id`),
    INDEX `NotaCreditoDetalles_producto_id_idx`(`producto_id`),
    INDEX `NotaCreditoDetalles_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotasCredito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serie_id` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `tipo_nota` ENUM('ANULACION_DE_LA_OPERACION', 'ANULACION_POR_ERROR_EN_EL_RUC', 'CORRECCION_POR_ERROR_EN_LA_DESCRIPCION', 'DESCUENTO_GLOBAL', 'DEVOLUCION_TOTAL', 'DEVOLUCION_PARCIAL', 'OTROS') NOT NULL,
    `motivo_sustento` TEXT NOT NULL,
    `monto_total` DECIMAL(12, 2) NOT NULL,
    `stock_retornado` BOOLEAN NOT NULL DEFAULT false,
    `estado_sunat` ENUM('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO') NULL DEFAULT 'PENDIENTE',
    `xml_url` VARCHAR(191) NULL,
    `cdr_url` VARCHAR(191) NULL,
    `hash_cpe` VARCHAR(191) NULL,
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenant_id` INTEGER NOT NULL,
    `venta_referencia_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,
    `efectivo_devuelto` BOOLEAN NOT NULL DEFAULT false,
    `fecha_devolucion` DATETIME(3) NULL,

    INDEX `NotasCredito_estado_sunat_idx`(`estado_sunat`),
    INDEX `NotasCredito_fecha_emision_idx`(`fecha_emision`),
    INDEX `NotasCredito_serie_id_idx`(`serie_id`),
    INDEX `NotasCredito_tenant_id_idx`(`tenant_id`),
    INDEX `NotasCredito_usuario_id_fkey`(`usuario_id`),
    INDEX `NotasCredito_venta_referencia_id_idx`(`venta_referencia_id`),
    UNIQUE INDEX `NotasCredito_serie_id_numero_tenant_id_key`(`serie_id`, `numero`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pagos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `monto` DECIMAL(12, 2) NOT NULL,
    `metodo_pago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'DEPOSITO', 'CHEQUE') NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `fecha_pago` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notas` TEXT NULL,
    `tenant_id` INTEGER NOT NULL,
    `cuenta_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,

    INDEX `Pagos_cuenta_id_idx`(`cuenta_id`),
    INDEX `Pagos_fecha_pago_idx`(`fecha_pago`),
    INDEX `Pagos_metodo_pago_idx`(`metodo_pago`),
    INDEX `Pagos_tenant_id_idx`(`tenant_id`),
    INDEX `Pagos_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UnidadesMedida` ADD CONSTRAINT `UnidadesMedida_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Marcas` ADD CONSTRAINT `Marcas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Categorias` ADD CONSTRAINT `Categorias_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Productos` ADD CONSTRAINT `Productos_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `Categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Productos` ADD CONSTRAINT `Productos_marca_id_fkey` FOREIGN KEY (`marca_id`) REFERENCES `Marcas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Productos` ADD CONSTRAINT `Productos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Productos` ADD CONSTRAINT `Productos_unidad_medida_id_fkey` FOREIGN KEY (`unidad_medida_id`) REFERENCES `UnidadesMedida`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `Ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `OrdenesCompra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_nota_credito_id_fkey` FOREIGN KEY (`nota_credito_id`) REFERENCES `NotasCredito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Proveedores` ADD CONSTRAINT `Proveedores_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenesCompra` ADD CONSTRAINT `OrdenesCompra_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `Proveedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenesCompra` ADD CONSTRAINT `OrdenesCompra_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenesCompra` ADD CONSTRAINT `OrdenesCompra_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenCompraDetalles` ADD CONSTRAINT `OrdenCompraDetalles_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `OrdenesCompra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenCompraDetalles` ADD CONSTRAINT `OrdenCompraDetalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenCompraDetalles` ADD CONSTRAINT `OrdenCompraDetalles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Clientes` ADD CONSTRAINT `Clientes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ventas` ADD CONSTRAINT `Ventas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ventas` ADD CONSTRAINT `Ventas_pedido_origen_id_fkey` FOREIGN KEY (`pedido_origen_id`) REFERENCES `Pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ventas` ADD CONSTRAINT `Ventas_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `Series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ventas` ADD CONSTRAINT `Ventas_sesion_caja_id_fkey` FOREIGN KEY (`sesion_caja_id`) REFERENCES `SesionesCaja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ventas` ADD CONSTRAINT `Ventas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ventas` ADD CONSTRAINT `Ventas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaDetalles` ADD CONSTRAINT `VentaDetalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaDetalles` ADD CONSTRAINT `VentaDetalles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaDetalles` ADD CONSTRAINT `VentaDetalles_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `Ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_usuario_gestion_id_fkey` FOREIGN KEY (`usuario_gestion_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoDetalles` ADD CONSTRAINT `PedidoDetalles_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `Pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoDetalles` ADD CONSTRAINT `PedidoDetalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoDetalles` ADD CONSTRAINT `PedidoDetalles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cajas` ADD CONSTRAINT `Cajas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionesCaja` ADD CONSTRAINT `SesionesCaja_caja_id_fkey` FOREIGN KEY (`caja_id`) REFERENCES `Cajas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionesCaja` ADD CONSTRAINT `SesionesCaja_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionesCaja` ADD CONSTRAINT `SesionesCaja_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosCaja` ADD CONSTRAINT `MovimientosCaja_sesion_caja_id_fkey` FOREIGN KEY (`sesion_caja_id`) REFERENCES `SesionesCaja`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosCaja` ADD CONSTRAINT `MovimientosCaja_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosCaja` ADD CONSTRAINT `MovimientosCaja_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `Ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosCaja` ADD CONSTRAINT `MovimientosCaja_nota_credito_id_fkey` FOREIGN KEY (`nota_credito_id`) REFERENCES `NotasCredito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosCaja` ADD CONSTRAINT `MovimientosCaja_pago_id_fkey` FOREIGN KEY (`pago_id`) REFERENCES `Pagos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Series` ADD CONSTRAINT `Series_caja_id_fkey` FOREIGN KEY (`caja_id`) REFERENCES `Cajas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Series` ADD CONSTRAINT `Series_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditoriaLogs` ADD CONSTRAINT `AuditoriaLogs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditoriaLogs` ADD CONSTRAINT `AuditoriaLogs_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuentasPorCobrar` ADD CONSTRAINT `CuentasPorCobrar_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuentasPorCobrar` ADD CONSTRAINT `CuentasPorCobrar_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuentasPorCobrar` ADD CONSTRAINT `CuentasPorCobrar_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `Ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiaRemisionDetalles` ADD CONSTRAINT `GuiaRemisionDetalles_guia_remision_id_fkey` FOREIGN KEY (`guia_remision_id`) REFERENCES `GuiasRemision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiaRemisionDetalles` ADD CONSTRAINT `GuiaRemisionDetalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiasRemision` ADD CONSTRAINT `GuiasRemision_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `Series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiasRemision` ADD CONSTRAINT `GuiasRemision_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiasRemision` ADD CONSTRAINT `GuiasRemision_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `Ventas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotaCreditoDetalles` ADD CONSTRAINT `NotaCreditoDetalles_nota_credito_id_fkey` FOREIGN KEY (`nota_credito_id`) REFERENCES `NotasCredito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotaCreditoDetalles` ADD CONSTRAINT `NotaCreditoDetalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotasCredito` ADD CONSTRAINT `NotasCredito_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `Series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotasCredito` ADD CONSTRAINT `NotasCredito_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotasCredito` ADD CONSTRAINT `NotasCredito_venta_referencia_id_fkey` FOREIGN KEY (`venta_referencia_id`) REFERENCES `Ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `CuentasPorCobrar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
