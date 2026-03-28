-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "ownedBy" TEXT,
ADD COLUMN     "responsiblePerson" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "additionalChargesDesc" TEXT,
ADD COLUMN     "serviceCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "visitingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Payable" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
