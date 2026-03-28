-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "clientType" TEXT DEFAULT 'walk-in',
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "preferredContact" TEXT DEFAULT 'phone',
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "category" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "leadTimeDays" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" TEXT DEFAULT 'immediate',
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
