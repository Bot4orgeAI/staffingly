ALTER TABLE "Client"
ADD COLUMN "verificationTriggers" TEXT,
ADD COLUMN "escalationRules" TEXT,
ADD COLUMN "reportingPreferences" TEXT;

ALTER TABLE "Invoice"
ADD COLUMN "disputeReason" TEXT,
ADD COLUMN "disputeStatus" TEXT,
ADD COLUMN "disputeOpenedAt" TIMESTAMP(3);
