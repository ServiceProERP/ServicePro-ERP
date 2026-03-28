-- CreateTable
CREATE TABLE "TechnicianRequest" (
    "id" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "empCode" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "jobId" TEXT,
    "currentJobNo" TEXT,
    "transferToTechId" TEXT,
    "transferToTechName" TEXT,
    "leaveType" TEXT,
    "leaveFrom" TIMESTAMP(3),
    "leaveTo" TIMESTAMP(3),
    "leaveDays" DOUBLE PRECISION,
    "leaveHandoverTo" TEXT,
    "overtimeDate" TIMESTAMP(3),
    "overtimeHours" DOUBLE PRECISION,
    "overtimeReason" TEXT,
    "expenseAmount" DOUBLE PRECISION,
    "expenseCategory" TEXT,
    "expenseDate" TIMESTAMP(3),
    "expenseBillUrl" TEXT,
    "toolName" TEXT,
    "toolQuantity" INTEGER,
    "toolNeededBy" TIMESTAMP(3),
    "handoverJobIds" TEXT,
    "handoverToTechId" TEXT,
    "handoverToTechName" TEXT,
    "handoverNotes" TEXT,
    "handoverDate" TIMESTAMP(3),
    "trainingTopic" TEXT,
    "trainingReason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisitLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "technicianId" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "onSiteContact" TEXT,
    "onSiteContactSign" TEXT,
    "machineConditionBefore" TEXT,
    "observedProblem" TEXT,
    "rootCause" TEXT,
    "actionTaken" TEXT,
    "machineConditionAfter" TEXT,
    "inspectionDone" BOOLEAN NOT NULL DEFAULT false,
    "cleaningDone" BOOLEAN NOT NULL DEFAULT false,
    "calibrationDone" TEXT,
    "lubricationDone" TEXT,
    "partsReplaced" BOOLEAN NOT NULL DEFAULT false,
    "testRunDone" BOOLEAN NOT NULL DEFAULT false,
    "machineHandedOver" BOOLEAN NOT NULL DEFAULT false,
    "nextServiceDate" TIMESTAMP(3),
    "additionalRecommendations" TEXT,
    "partsToOrder" TEXT,
    "clientRepresentative" TEXT,
    "clientSatisfaction" TEXT,
    "clientComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "addedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "technicianId" TEXT,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianRequest_requestNo_key" ON "TechnicianRequest"("requestNo");

-- AddForeignKey
ALTER TABLE "SiteVisitLog" ADD CONSTRAINT "SiteVisitLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
