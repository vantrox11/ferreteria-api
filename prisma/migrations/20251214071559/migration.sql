/*
  Warnings:

  - You are about to drop the `AuditoriaLogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Cajas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Categorias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Clientes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CuentasPorCobrar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GuiaRemisionDetalles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GuiasRemision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Marcas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovimientosCaja` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovimientosInventario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotaCreditoDetalles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotasCredito` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrdenCompraDetalles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrdenesCompra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pagos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PedidoDetalles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pedidos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Productos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Proveedores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Series` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SesionesCaja` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tenants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnidadesMedida` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Usuarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VentaDetalles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ventas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AuditoriaLogs` DROP FOREIGN KEY `AuditoriaLogs_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `AuditoriaLogs` DROP FOREIGN KEY `AuditoriaLogs_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `Cajas` DROP FOREIGN KEY `Cajas_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Categorias` DROP FOREIGN KEY `Categorias_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Clientes` DROP FOREIGN KEY `Clientes_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `CuentasPorCobrar` DROP FOREIGN KEY `CuentasPorCobrar_cliente_id_fkey`;

-- DropForeignKey
ALTER TABLE `CuentasPorCobrar` DROP FOREIGN KEY `CuentasPorCobrar_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `CuentasPorCobrar` DROP FOREIGN KEY `CuentasPorCobrar_venta_id_fkey`;

-- DropForeignKey
ALTER TABLE `GuiaRemisionDetalles` DROP FOREIGN KEY `GuiaRemisionDetalles_guia_remision_id_fkey`;

-- DropForeignKey
ALTER TABLE `GuiaRemisionDetalles` DROP FOREIGN KEY `GuiaRemisionDetalles_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `GuiasRemision` DROP FOREIGN KEY `GuiasRemision_serie_id_fkey`;

-- DropForeignKey
ALTER TABLE `GuiasRemision` DROP FOREIGN KEY `GuiasRemision_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `GuiasRemision` DROP FOREIGN KEY `GuiasRemision_venta_id_fkey`;

-- DropForeignKey
ALTER TABLE `Marcas` DROP FOREIGN KEY `Marcas_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosCaja` DROP FOREIGN KEY `MovimientosCaja_nota_credito_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosCaja` DROP FOREIGN KEY `MovimientosCaja_pago_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosCaja` DROP FOREIGN KEY `MovimientosCaja_sesion_caja_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosCaja` DROP FOREIGN KEY `MovimientosCaja_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosCaja` DROP FOREIGN KEY `MovimientosCaja_venta_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosInventario` DROP FOREIGN KEY `MovimientosInventario_nota_credito_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosInventario` DROP FOREIGN KEY `MovimientosInventario_orden_compra_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosInventario` DROP FOREIGN KEY `MovimientosInventario_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosInventario` DROP FOREIGN KEY `MovimientosInventario_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosInventario` DROP FOREIGN KEY `MovimientosInventario_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `MovimientosInventario` DROP FOREIGN KEY `MovimientosInventario_venta_id_fkey`;

-- DropForeignKey
ALTER TABLE `NotaCreditoDetalles` DROP FOREIGN KEY `NotaCreditoDetalles_nota_credito_id_fkey`;

-- DropForeignKey
ALTER TABLE `NotaCreditoDetalles` DROP FOREIGN KEY `NotaCreditoDetalles_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `NotasCredito` DROP FOREIGN KEY `NotasCredito_serie_id_fkey`;

-- DropForeignKey
ALTER TABLE `NotasCredito` DROP FOREIGN KEY `NotasCredito_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `NotasCredito` DROP FOREIGN KEY `NotasCredito_venta_referencia_id_fkey`;

-- DropForeignKey
ALTER TABLE `OrdenCompraDetalles` DROP FOREIGN KEY `OrdenCompraDetalles_orden_compra_id_fkey`;

-- DropForeignKey
ALTER TABLE `OrdenCompraDetalles` DROP FOREIGN KEY `OrdenCompraDetalles_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `OrdenCompraDetalles` DROP FOREIGN KEY `OrdenCompraDetalles_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `OrdenesCompra` DROP FOREIGN KEY `OrdenesCompra_proveedor_id_fkey`;

-- DropForeignKey
ALTER TABLE `OrdenesCompra` DROP FOREIGN KEY `OrdenesCompra_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `OrdenesCompra` DROP FOREIGN KEY `OrdenesCompra_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pagos` DROP FOREIGN KEY `Pagos_cuenta_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pagos` DROP FOREIGN KEY `Pagos_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pagos` DROP FOREIGN KEY `Pagos_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `PedidoDetalles` DROP FOREIGN KEY `PedidoDetalles_pedido_id_fkey`;

-- DropForeignKey
ALTER TABLE `PedidoDetalles` DROP FOREIGN KEY `PedidoDetalles_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `PedidoDetalles` DROP FOREIGN KEY `PedidoDetalles_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pedidos` DROP FOREIGN KEY `Pedidos_cliente_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pedidos` DROP FOREIGN KEY `Pedidos_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pedidos` DROP FOREIGN KEY `Pedidos_usuario_gestion_id_fkey`;

-- DropForeignKey
ALTER TABLE `Productos` DROP FOREIGN KEY `Productos_categoria_id_fkey`;

-- DropForeignKey
ALTER TABLE `Productos` DROP FOREIGN KEY `Productos_marca_id_fkey`;

-- DropForeignKey
ALTER TABLE `Productos` DROP FOREIGN KEY `Productos_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Productos` DROP FOREIGN KEY `Productos_unidad_medida_id_fkey`;

-- DropForeignKey
ALTER TABLE `Proveedores` DROP FOREIGN KEY `Proveedores_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Series` DROP FOREIGN KEY `Series_caja_id_fkey`;

-- DropForeignKey
ALTER TABLE `Series` DROP FOREIGN KEY `Series_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `SesionesCaja` DROP FOREIGN KEY `SesionesCaja_caja_id_fkey`;

-- DropForeignKey
ALTER TABLE `SesionesCaja` DROP FOREIGN KEY `SesionesCaja_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `SesionesCaja` DROP FOREIGN KEY `SesionesCaja_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `UnidadesMedida` DROP FOREIGN KEY `UnidadesMedida_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Usuarios` DROP FOREIGN KEY `Usuarios_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `VentaDetalles` DROP FOREIGN KEY `VentaDetalles_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `VentaDetalles` DROP FOREIGN KEY `VentaDetalles_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `VentaDetalles` DROP FOREIGN KEY `VentaDetalles_venta_id_fkey`;

-- DropForeignKey
ALTER TABLE `Ventas` DROP FOREIGN KEY `Ventas_cliente_id_fkey`;

-- DropForeignKey
ALTER TABLE `Ventas` DROP FOREIGN KEY `Ventas_pedido_origen_id_fkey`;

-- DropForeignKey
ALTER TABLE `Ventas` DROP FOREIGN KEY `Ventas_serie_id_fkey`;

-- DropForeignKey
ALTER TABLE `Ventas` DROP FOREIGN KEY `Ventas_sesion_caja_id_fkey`;

-- DropForeignKey
ALTER TABLE `Ventas` DROP FOREIGN KEY `Ventas_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `Ventas` DROP FOREIGN KEY `Ventas_usuario_id_fkey`;

-- DropTable
DROP TABLE `AuditoriaLogs`;

-- DropTable
DROP TABLE `Cajas`;

-- DropTable
DROP TABLE `Categorias`;

-- DropTable
DROP TABLE `Clientes`;

-- DropTable
DROP TABLE `CuentasPorCobrar`;

-- DropTable
DROP TABLE `GuiaRemisionDetalles`;

-- DropTable
DROP TABLE `GuiasRemision`;

-- DropTable
DROP TABLE `Marcas`;

-- DropTable
DROP TABLE `MovimientosCaja`;

-- DropTable
DROP TABLE `MovimientosInventario`;

-- DropTable
DROP TABLE `NotaCreditoDetalles`;

-- DropTable
DROP TABLE `NotasCredito`;

-- DropTable
DROP TABLE `OrdenCompraDetalles`;

-- DropTable
DROP TABLE `OrdenesCompra`;

-- DropTable
DROP TABLE `Pagos`;

-- DropTable
DROP TABLE `PedidoDetalles`;

-- DropTable
DROP TABLE `Pedidos`;

-- DropTable
DROP TABLE `Productos`;

-- DropTable
DROP TABLE `Proveedores`;

-- DropTable
DROP TABLE `Series`;

-- DropTable
DROP TABLE `SesionesCaja`;

-- DropTable
DROP TABLE `Tenants`;

-- DropTable
DROP TABLE `UnidadesMedida`;

-- DropTable
DROP TABLE `Usuarios`;

-- DropTable
DROP TABLE `VentaDetalles`;

-- DropTable
DROP TABLE `Ventas`;

-- CreateTable
CREATE TABLE `unidades_medida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `permite_decimales` BOOLEAN NOT NULL DEFAULT false,
    `tenant_id` INTEGER NOT NULL,

    UNIQUE INDEX `unidades_medida_tenant_id_codigo_key`(`tenant_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marcas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `logo_url` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `tenant_id` INTEGER NOT NULL,

    UNIQUE INDEX `marcas_tenant_id_nombre_key`(`tenant_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_empresa` VARCHAR(191) NOT NULL,
    `subdominio` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `configuracion` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tenants_subdominio_key`(`subdominio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NULL,
    `rol` ENUM('admin', 'empleado') NOT NULL DEFAULT 'empleado',
    `tenant_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `usuarios_tenant_id_email_key`(`tenant_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `tenant_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `categorias_tenant_id_nombre_key`(`tenant_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `descripcion` VARCHAR(191) NULL,
    `costo_compra` DECIMAL(12, 4) NULL,
    `stock` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `stock_minimo` INTEGER NOT NULL DEFAULT 5,
    `tenant_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `marca_id` INTEGER NULL,
    `unidad_medida_id` INTEGER NOT NULL,
    `afectacion_igv` ENUM('GRAVADO', 'EXONERADO', 'INAFECTO') NOT NULL DEFAULT 'GRAVADO',
    `precio_base` DECIMAL(12, 4) NOT NULL,
    `imagen_url` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `deleted_at` DATETIME(3) NULL,

    INDEX `productos_categoria_id_idx`(`categoria_id`),
    INDEX `productos_marca_id_idx`(`marca_id`),
    INDEX `productos_unidad_medida_id_idx`(`unidad_medida_id`),
    UNIQUE INDEX `productos_tenant_id_sku_key`(`tenant_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_inventario` (
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

    INDEX `movimientos_inventario_producto_id_created_at_idx`(`producto_id`, `created_at`),
    INDEX `movimientos_inventario_tenant_id_idx`(`tenant_id`),
    INDEX `movimientos_inventario_venta_id_idx`(`venta_id`),
    INDEX `movimientos_inventario_orden_compra_id_idx`(`orden_compra_id`),
    INDEX `movimientos_inventario_nota_credito_id_idx`(`nota_credito_id`),
    INDEX `movimientos_inventario_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proveedores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `ruc_identidad` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `tenant_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `tipo_documento` ENUM('RUC', 'DNI', 'CE') NOT NULL DEFAULT 'RUC',
    `deleted_at` DATETIME(3) NULL,

    INDEX `proveedores_tipo_documento_idx`(`tipo_documento`),
    UNIQUE INDEX `proveedores_tenant_id_ruc_identidad_key`(`tenant_id`, `ruc_identidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes_compra` (
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

    INDEX `ordenes_compra_tenant_id_idx`(`tenant_id`),
    INDEX `ordenes_compra_proveedor_id_idx`(`proveedor_id`),
    INDEX `ordenes_compra_usuario_id_idx`(`usuario_id`),
    INDEX `ordenes_compra_tipo_comprobante_idx`(`tipo_comprobante`),
    INDEX `ordenes_compra_fecha_emision_idx`(`fecha_emision`),
    UNIQUE INDEX `ordenes_compra_serie_numero_proveedor_ruc_tenant_id_key`(`serie`, `numero`, `proveedor_ruc`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orden_compra_detalles` (
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

    INDEX `orden_compra_detalles_tenant_id_idx`(`tenant_id`),
    INDEX `orden_compra_detalles_orden_compra_id_idx`(`orden_compra_id`),
    INDEX `orden_compra_detalles_producto_id_idx`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `documento_identidad` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `tenant_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `razon_social` VARCHAR(191) NULL,
    `ruc` VARCHAR(191) NULL,
    `dias_credito` INTEGER NOT NULL DEFAULT 0,
    `limite_credito` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `deleted_at` DATETIME(3) NULL,

    INDEX `clientes_ruc_idx`(`ruc`),
    UNIQUE INDEX `clientes_tenant_id_documento_identidad_key`(`tenant_id`, `documento_identidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ventas` (
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
    `cdr_url` VARCHAR(191) NULL,
    `codigo_qr` TEXT NULL,
    `estado_sunat` ENUM('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO') NULL DEFAULT 'PENDIENTE',
    `hash_cpe` VARCHAR(191) NULL,
    `referencia_pago` VARCHAR(191) NULL,
    `xml_url` VARCHAR(191) NULL,

    UNIQUE INDEX `ventas_pedido_origen_id_key`(`pedido_origen_id`),
    INDEX `ventas_tenant_id_idx`(`tenant_id`),
    INDEX `ventas_cliente_id_idx`(`cliente_id`),
    INDEX `ventas_usuario_id_idx`(`usuario_id`),
    INDEX `ventas_pedido_origen_id_idx`(`pedido_origen_id`),
    INDEX `ventas_sesion_caja_id_idx`(`sesion_caja_id`),
    INDEX `ventas_serie_id_idx`(`serie_id`),
    UNIQUE INDEX `ventas_serie_id_numero_comprobante_tenant_id_key`(`serie_id`, `numero_comprobante`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venta_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `precio_unitario` DECIMAL(12, 4) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `venta_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `igv_total` DECIMAL(12, 4) NOT NULL,
    `tasa_igv` DECIMAL(5, 2) NOT NULL,
    `valor_unitario` DECIMAL(12, 4) NOT NULL,
    `costo_unitario` DECIMAL(12, 4) NULL,

    INDEX `venta_detalles_venta_id_idx`(`venta_id`),
    INDEX `venta_detalles_producto_id_idx`(`producto_id`),
    INDEX `venta_detalles_tenant_id_venta_id_idx`(`tenant_id`, `venta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('pendiente', 'confirmado', 'cancelado', 'entregado') NOT NULL DEFAULT 'pendiente',
    `tipo_recojo` ENUM('tienda', 'envio') NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `cliente_id` INTEGER NULL,
    `usuario_gestion_id` INTEGER NULL,

    INDEX `pedidos_tenant_id_idx`(`tenant_id`),
    INDEX `pedidos_cliente_id_idx`(`cliente_id`),
    INDEX `pedidos_usuario_gestion_id_idx`(`usuario_gestion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedido_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `pedido_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,

    INDEX `pedido_detalles_tenant_id_idx`(`tenant_id`),
    INDEX `pedido_detalles_pedido_id_idx`(`pedido_id`),
    INDEX `pedido_detalles_producto_id_idx`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cajas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `tenant_id` INTEGER NOT NULL,

    UNIQUE INDEX `cajas_tenant_id_nombre_key`(`tenant_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesiones_caja` (
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

    INDEX `sesiones_caja_tenant_id_idx`(`tenant_id`),
    INDEX `sesiones_caja_caja_id_idx`(`caja_id`),
    INDEX `sesiones_caja_usuario_id_idx`(`usuario_id`),
    INDEX `sesiones_caja_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_caja` (
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

    INDEX `movimientos_caja_tenant_id_idx`(`tenant_id`),
    INDEX `movimientos_caja_sesion_caja_id_idx`(`sesion_caja_id`),
    INDEX `movimientos_caja_venta_id_idx`(`venta_id`),
    INDEX `movimientos_caja_nota_credito_id_idx`(`nota_credito_id`),
    INDEX `movimientos_caja_pago_id_idx`(`pago_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo_comprobante` ENUM('FACTURA', 'BOLETA', 'NOTA_VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION') NOT NULL,
    `correlativo_actual` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `tenant_id` INTEGER NOT NULL,
    `caja_id` INTEGER NULL,

    INDEX `series_caja_id_idx`(`caja_id`),
    INDEX `series_tipo_comprobante_idx`(`tipo_comprobante`),
    UNIQUE INDEX `series_tenant_id_codigo_key`(`tenant_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria_logs` (
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

    INDEX `auditoria_logs_tenant_id_idx`(`tenant_id`),
    INDEX `auditoria_logs_usuario_id_idx`(`usuario_id`),
    INDEX `auditoria_logs_accion_idx`(`accion`),
    INDEX `auditoria_logs_tabla_afectada_idx`(`tabla_afectada`),
    INDEX `auditoria_logs_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cuentas_por_cobrar` (
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

    UNIQUE INDEX `cuentas_por_cobrar_venta_id_key`(`venta_id`),
    INDEX `cuentas_por_cobrar_cliente_id_idx`(`cliente_id`),
    INDEX `cuentas_por_cobrar_estado_idx`(`estado`),
    INDEX `cuentas_por_cobrar_fecha_vencimiento_idx`(`fecha_vencimiento`),
    INDEX `cuentas_por_cobrar_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guia_remision_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `guia_remision_id` INTEGER NOT NULL,

    INDEX `guia_remision_detalles_guia_remision_id_idx`(`guia_remision_id`),
    INDEX `guia_remision_detalles_producto_id_idx`(`producto_id`),
    INDEX `guia_remision_detalles_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guias_remision` (
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

    INDEX `guias_remision_estado_sunat_idx`(`estado_sunat`),
    INDEX `guias_remision_fecha_emision_idx`(`fecha_emision`),
    INDEX `guias_remision_serie_id_idx`(`serie_id`),
    INDEX `guias_remision_tenant_id_idx`(`tenant_id`),
    INDEX `GuiasRemision_usuario_id_fkey`(`usuario_id`),
    INDEX `guias_remision_venta_id_idx`(`venta_id`),
    UNIQUE INDEX `guias_remision_serie_id_numero_tenant_id_key`(`serie_id`, `numero`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nota_credito_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `valor_unitario` DECIMAL(12, 4) NOT NULL,
    `precio_unitario` DECIMAL(12, 4) NOT NULL,
    `igv_total` DECIMAL(12, 4) NOT NULL,
    `tasa_igv` DECIMAL(5, 2) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `nota_credito_id` INTEGER NOT NULL,

    INDEX `nota_credito_detalles_nota_credito_id_idx`(`nota_credito_id`),
    INDEX `nota_credito_detalles_producto_id_idx`(`producto_id`),
    INDEX `nota_credito_detalles_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notas_credito` (
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

    INDEX `notas_credito_estado_sunat_idx`(`estado_sunat`),
    INDEX `notas_credito_fecha_emision_idx`(`fecha_emision`),
    INDEX `notas_credito_serie_id_idx`(`serie_id`),
    INDEX `notas_credito_tenant_id_idx`(`tenant_id`),
    INDEX `NotasCredito_usuario_id_fkey`(`usuario_id`),
    INDEX `notas_credito_venta_referencia_id_idx`(`venta_referencia_id`),
    UNIQUE INDEX `notas_credito_serie_id_numero_tenant_id_key`(`serie_id`, `numero`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `monto` DECIMAL(12, 2) NOT NULL,
    `metodo_pago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'DEPOSITO', 'CHEQUE') NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `fecha_pago` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notas` TEXT NULL,
    `tenant_id` INTEGER NOT NULL,
    `cuenta_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,

    INDEX `pagos_cuenta_id_idx`(`cuenta_id`),
    INDEX `pagos_fecha_pago_idx`(`fecha_pago`),
    INDEX `pagos_metodo_pago_idx`(`metodo_pago`),
    INDEX `pagos_tenant_id_idx`(`tenant_id`),
    INDEX `pagos_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `unidades_medida` ADD CONSTRAINT `unidades_medida_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marcas` ADD CONSTRAINT `marcas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_marca_id_fkey` FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_unidad_medida_id_fkey` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_nota_credito_id_fkey` FOREIGN KEY (`nota_credito_id`) REFERENCES `notas_credito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proveedores` ADD CONSTRAINT `proveedores_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden_compra_detalles` ADD CONSTRAINT `orden_compra_detalles_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden_compra_detalles` ADD CONSTRAINT `orden_compra_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden_compra_detalles` ADD CONSTRAINT `orden_compra_detalles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_pedido_origen_id_fkey` FOREIGN KEY (`pedido_origen_id`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_sesion_caja_id_fkey` FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalles` ADD CONSTRAINT `venta_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalles` ADD CONSTRAINT `venta_detalles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalles` ADD CONSTRAINT `venta_detalles_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_usuario_gestion_id_fkey` FOREIGN KEY (`usuario_gestion_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cajas` ADD CONSTRAINT `cajas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesiones_caja` ADD CONSTRAINT `sesiones_caja_caja_id_fkey` FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesiones_caja` ADD CONSTRAINT `sesiones_caja_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesiones_caja` ADD CONSTRAINT `sesiones_caja_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_caja` ADD CONSTRAINT `movimientos_caja_sesion_caja_id_fkey` FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_caja` ADD CONSTRAINT `movimientos_caja_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_caja` ADD CONSTRAINT `movimientos_caja_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_caja` ADD CONSTRAINT `movimientos_caja_nota_credito_id_fkey` FOREIGN KEY (`nota_credito_id`) REFERENCES `notas_credito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_caja` ADD CONSTRAINT `movimientos_caja_pago_id_fkey` FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series` ADD CONSTRAINT `series_caja_id_fkey` FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series` ADD CONSTRAINT `series_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditoria_logs` ADD CONSTRAINT `auditoria_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditoria_logs` ADD CONSTRAINT `auditoria_logs_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cuentas_por_cobrar` ADD CONSTRAINT `cuentas_por_cobrar_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cuentas_por_cobrar` ADD CONSTRAINT `cuentas_por_cobrar_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cuentas_por_cobrar` ADD CONSTRAINT `cuentas_por_cobrar_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guia_remision_detalles` ADD CONSTRAINT `guia_remision_detalles_guia_remision_id_fkey` FOREIGN KEY (`guia_remision_id`) REFERENCES `guias_remision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guia_remision_detalles` ADD CONSTRAINT `guia_remision_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guias_remision` ADD CONSTRAINT `guias_remision_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guias_remision` ADD CONSTRAINT `guias_remision_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guias_remision` ADD CONSTRAINT `guias_remision_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nota_credito_detalles` ADD CONSTRAINT `nota_credito_detalles_nota_credito_id_fkey` FOREIGN KEY (`nota_credito_id`) REFERENCES `notas_credito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nota_credito_detalles` ADD CONSTRAINT `nota_credito_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notas_credito` ADD CONSTRAINT `notas_credito_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notas_credito` ADD CONSTRAINT `notas_credito_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notas_credito` ADD CONSTRAINT `notas_credito_venta_referencia_id_fkey` FOREIGN KEY (`venta_referencia_id`) REFERENCES `ventas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_por_cobrar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
