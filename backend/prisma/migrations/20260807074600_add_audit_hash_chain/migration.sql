-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "currentHash" TEXT NOT NULL,
ADD COLUMN     "previousHash" TEXT NOT NULL DEFAULT '0';

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceForm_employeeId_type_key" ON "ComplianceForm"("employeeId", "type");
