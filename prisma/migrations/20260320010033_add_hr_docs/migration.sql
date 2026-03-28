-- CreateTable
CREATE TABLE "HRDoc" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRDoc_pkey" PRIMARY KEY ("id")
);
