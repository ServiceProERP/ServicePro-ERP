-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "companyTagline" TEXT NOT NULL DEFAULT 'Professional Service Management',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyGstin" TEXT NOT NULL DEFAULT '',
    "jobPrefix" TEXT NOT NULL DEFAULT 'JOB',
    "clientPrefix" TEXT NOT NULL DEFAULT 'CLT',
    "vendorPrefix" TEXT NOT NULL DEFAULT 'VND',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "quotationPrefix" TEXT NOT NULL DEFAULT 'QT',
    "defaultTaxRate" TEXT NOT NULL DEFAULT '18',
    "defaultPaymentTerms" TEXT NOT NULL DEFAULT '30',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "financialYearStart" TEXT NOT NULL DEFAULT 'April',
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "enableSMSNotifications" BOOLEAN NOT NULL DEFAULT false,
    "enableOverdueAlerts" BOOLEAN NOT NULL DEFAULT true,
    "enableLowStockAlerts" BOOLEAN NOT NULL DEFAULT true,
    "overdueAlertDays" TEXT NOT NULL DEFAULT '1',
    "lowStockAlertLevel" TEXT NOT NULL DEFAULT '10',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
