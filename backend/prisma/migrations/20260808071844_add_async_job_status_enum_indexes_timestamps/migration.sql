/*
  Warnings:

  - Changed the type of `status` on the `AsyncJob` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `ComplianceForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AsyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "AsyncJob" DROP COLUMN "status",
ADD COLUMN     "status" "AsyncJobStatus" NOT NULL;

-- AlterTable
ALTER TABLE "ComplianceForm" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "AsyncJob_status_idx" ON "AsyncJob"("status");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");

-- CreateIndex
CREATE INDEX "ComplianceForm_employeeId_idx" ON "ComplianceForm"("employeeId");

-- CreateIndex
CREATE INDEX "Document_employeeId_idx" ON "Document"("employeeId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "OtpCode_userId_idx" ON "OtpCode"("userId");
