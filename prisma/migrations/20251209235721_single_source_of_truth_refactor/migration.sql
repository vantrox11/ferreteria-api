/*
  Warnings:

  - You are about to drop the column `estado_pago` on the `Ventas` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_vencimiento` on the `Ventas` table. All the data in the column will be lost.
  - You are about to drop the column `monto_pagado` on the `Ventas` table. All the data in the column will be lost.
  - You are about to drop the column `saldo_pendiente` on the `Ventas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Ventas` DROP COLUMN `estado_pago`,
    DROP COLUMN `fecha_vencimiento`,
    DROP COLUMN `monto_pagado`,
    DROP COLUMN `saldo_pendiente`;
