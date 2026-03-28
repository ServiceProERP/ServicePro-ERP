-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "accountNo" TEXT,
ADD COLUMN     "additionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ifscCode" TEXT,
ADD COLUMN     "paymentMode" TEXT,
ADD COLUMN     "termsConditions" TEXT,
ADD COLUMN     "upiId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'full';
