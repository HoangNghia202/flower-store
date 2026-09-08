-- AlterTable
ALTER TABLE "CustomBouquet" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "wrapPaper" DROP NOT NULL,
ALTER COLUMN "ribbon" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "orderSeq" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "addons" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderSeq_key" ON "Order"("orderSeq");
