-- DropForeignKey
ALTER TABLE `AuditoriaLogs` DROP FOREIGN KEY `AuditoriaLogs_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `InventarioAjustes` DROP FOREIGN KEY `InventarioAjustes_producto_id_fkey`;

-- DropForeignKey
ALTER TABLE `Pagos` DROP FOREIGN KEY `Pagos_cuenta_id_fkey`;

-- DropForeignKey
ALTER TABLE `SesionesCaja` DROP FOREIGN KEY `SesionesCaja_caja_id_fkey`;

-- DropForeignKey
ALTER TABLE `SesionesCaja` DROP FOREIGN KEY `SesionesCaja_usuario_id_fkey`;

-- AddForeignKey
ALTER TABLE `InventarioAjustes` ADD CONSTRAINT `InventarioAjustes_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionesCaja` ADD CONSTRAINT `SesionesCaja_caja_id_fkey` FOREIGN KEY (`caja_id`) REFERENCES `Cajas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionesCaja` ADD CONSTRAINT `SesionesCaja_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditoriaLogs` ADD CONSTRAINT `AuditoriaLogs_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `CuentasPorCobrar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
