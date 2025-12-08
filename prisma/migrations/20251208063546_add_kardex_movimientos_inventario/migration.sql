/*
  Warnings:

  - You are about to drop the `InventarioAjustes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `InventarioAjustes` DROP FOREIGN KEY `InventarioAjustes_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `InventarioAjustes` DROP FOREIGN KEY `InventarioAjustes_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `InventarioAjustes` DROP FOREIGN KEY `InventarioAjustes_usuario_id_fkey`;

-- AlterTable
ALTER TABLE `Productos` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `InventarioAjustes`;

-- CreateTable
CREATE TABLE `MovimientosInventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `tipo_movimiento` ENUM('ENTRADA_COMPRA', 'SALIDA_VENTA', 'ENTRADA_AJUSTE', 'SALIDA_AJUSTE', 'ENTRADA_DEVOLUCION', 'SALIDA_DEVOLUCION') NOT NULL,
    `cantidad` DECIMAL(12, 3) NOT NULL,
    `saldo_anterior` DECIMAL(12, 3) NOT NULL,
    `saldo_nuevo` DECIMAL(12, 3) NOT NULL,
    `costo_unitario` DECIMAL(12, 4) NULL,
    `referencia_tipo` VARCHAR(30) NOT NULL,
    `referencia_id` INTEGER NOT NULL,
    `motivo` TEXT NULL,
    `tenant_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimientosInventario_producto_id_created_at_idx`(`producto_id`, `created_at`),
    INDEX `MovimientosInventario_tenant_id_idx`(`tenant_id`),
    INDEX `MovimientosInventario_referencia_tipo_referencia_id_idx`(`referencia_tipo`, `referencia_id`),
    INDEX `MovimientosInventario_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientosInventario` ADD CONSTRAINT `MovimientosInventario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
