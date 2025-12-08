/*
  Warnings:

  - You are about to alter the column `valor_unitario` on the `NotaCreditoDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `precio_unitario` on the `NotaCreditoDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `igv_total` on the `NotaCreditoDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `costo_compra` on the `Productos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,4)`.
  - You are about to alter the column `precio_base` on the `Productos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `precio_unitario` on the `VentaDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `igv_total` on the `VentaDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `tasa_igv` on the `VentaDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(5,4)`.
  - You are about to alter the column `valor_unitario` on the `VentaDetalles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.

*/
-- AlterTable
ALTER TABLE `Clientes` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `NotaCreditoDetalles` MODIFY `valor_unitario` DECIMAL(12, 4) NOT NULL,
    MODIFY `precio_unitario` DECIMAL(12, 4) NOT NULL,
    MODIFY `igv_total` DECIMAL(12, 4) NOT NULL;

-- AlterTable
ALTER TABLE `Productos` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    MODIFY `costo_compra` DECIMAL(12, 4) NULL,
    MODIFY `precio_base` DECIMAL(12, 4) NOT NULL;

-- AlterTable
ALTER TABLE `Proveedores` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `VentaDetalles` MODIFY `precio_unitario` DECIMAL(12, 4) NOT NULL,
    MODIFY `igv_total` DECIMAL(12, 4) NOT NULL,
    MODIFY `tasa_igv` DECIMAL(5, 4) NOT NULL,
    MODIFY `valor_unitario` DECIMAL(12, 4) NOT NULL;
