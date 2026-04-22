ALTER TABLE "EligibilityCheck"
ADD COLUMN "gatewayPatientId" TEXT;

ALTER TABLE "PriorAuthCase"
ADD COLUMN "gatewayPatientId" TEXT;

CREATE INDEX "EligibilityCheck_gatewayPatientId_idx"
ON "EligibilityCheck"("gatewayPatientId");

CREATE INDEX "PriorAuthCase_gatewayPatientId_idx"
ON "PriorAuthCase"("gatewayPatientId");
