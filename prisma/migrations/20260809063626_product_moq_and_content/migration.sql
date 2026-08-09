-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "moq" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "usageInstructions" TEXT;
