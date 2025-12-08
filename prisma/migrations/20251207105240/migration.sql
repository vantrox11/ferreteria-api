-- AlterTable
ALTER TABLE `MovimientosCaja` ADD COLUMN `referencia_id` VARCHAR(50) NULL,
    ADD COLUMN `referencia_tipo` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `NotasCredito` ADD COLUMN `efectivo_devuelto` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `fecha_devolucion` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `MovimientosCaja_referencia_tipo_referencia_id_idx` ON `MovimientosCaja`(`referencia_tipo`, `referencia_id`);
