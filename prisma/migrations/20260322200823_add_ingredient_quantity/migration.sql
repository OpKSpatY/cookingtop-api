/*
  Warnings:

  - Added the required column `quantity` to the `user_ingredients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_ingredients" ADD COLUMN     "quantity" TEXT NOT NULL;
