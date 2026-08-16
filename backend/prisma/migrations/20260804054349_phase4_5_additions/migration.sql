-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployeeStatus" ADD VALUE 'REGISTERED';
ALTER TYPE "EmployeeStatus" ADD VALUE 'MANAGER_REVIEW';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "lastRejectionReason" TEXT;

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "salary" INTEGER NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");
