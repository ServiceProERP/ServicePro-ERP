/*
  Warnings:

  - You are about to drop the `HRDoc` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "HRDoc";

-- CreateTable
CREATE TABLE "HrDoc" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrDoc_pkey" PRIMARY KEY ("id")
);
