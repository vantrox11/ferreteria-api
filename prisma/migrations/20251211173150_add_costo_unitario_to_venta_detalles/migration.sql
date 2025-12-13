/*
  Warnings:

  - You are about to alter the column `tasa_igv` on the `NotaCreditoDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `Decimal(5,2)`.
  - You are about to alter the column `tasa_igv` on the `VentaDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE `NotaCreditoDetalles` MODIFY `tasa_igv` DECIMAL(5, 2) NOT NULL;

-- AlterTable
ALTER TABLE `VentaDetalles` ADD COLUMN `costo_unitario` DECIMAL(12, 4) NULL,
    MODIFY `tasa_igv` DECIMAL(5, 2) NOT NULL;
