-- AlterTable
ALTER TABLE "PriorAuthCase" ADD COLUMN     "denialCode" TEXT,
ADD COLUMN     "appealDeadline" TIMESTAMP(3),
ADD COLUMN     "appealLetter" TEXT,
ADD COLUMN     "submissionMethod" TEXT,
ADD COLUMN     "confirmationNumber" TEXT,
ADD COLUMN     "covermymedsReference" TEXT,
ADD COLUMN     "aiReviewResultJson" TEXT,
ADD COLUMN     "aiConfidenceScore" INTEGER,
ADD COLUMN     "medicalNecessitySummary" TEXT,
ADD COLUMN     "intakeNotes" TEXT,
ADD COLUMN     "facilityName" TEXT,
ADD COLUMN     "facilityNpi" TEXT,
ADD COLUMN     "isMedicationPa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicationName" TEXT,
ADD COLUMN     "ndcCode" TEXT,
ADD COLUMN     "daysSupply" TEXT,
ADD COLUMN     "quantityRequested" TEXT,
ADD COLUMN     "pharmacyNpi" TEXT,
ADD COLUMN     "stepTherapyConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "p2pPhysicianName" TEXT,
ADD COLUMN     "p2pPhysicianNpi" TEXT,
ADD COLUMN     "p2pReviewerName" TEXT,
ADD COLUMN     "p2pScheduledAt" TIMESTAMP(3),
ADD COLUMN     "p2pContactNumber" TEXT,
ADD COLUMN     "p2pOutcome" TEXT;

-- CreateTable
CREATE TABLE "PriorAuthActionResult" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "gatewayPatientId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "confirmationNumber" TEXT,
    "appealLetter" TEXT,
    "checklistItemsJson" TEXT,
    "missingItemsJson" TEXT,
    "confidenceScore" INTEGER,
    "medicalNecessitySummary" TEXT,
    "rawResponse" TEXT,
    "errorMessage" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriorAuthActionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriorAuthCase_eligibilityCheckId_idx" ON "PriorAuthCase"("eligibilityCheckId");

-- CreateIndex
CREATE INDEX "PriorAuthActionResult_caseId_idx" ON "PriorAuthActionResult"("caseId");

-- CreateIndex
CREATE INDEX "PriorAuthActionResult_clientId_idx" ON "PriorAuthActionResult"("clientId");

-- CreateIndex
CREATE INDEX "PriorAuthActionResult_gatewayPatientId_idx" ON "PriorAuthActionResult"("gatewayPatientId");

-- CreateIndex
CREATE INDEX "PriorAuthActionResult_action_idx" ON "PriorAuthActionResult"("action");

-- AddForeignKey
ALTER TABLE "PriorAuthActionResult" ADD CONSTRAINT "PriorAuthActionResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PriorAuthCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthActionResult" ADD CONSTRAINT "PriorAuthActionResult_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthActionResult" ADD CONSTRAINT "PriorAuthActionResult_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
