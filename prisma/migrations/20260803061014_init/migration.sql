-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('INVITED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'COMPLIANCE_PROCESSING', 'PENDING_SIGNATURE', 'DAY1_READY', 'ACTIVE', 'MILESTONE_30', 'MILESTONE_60', 'MILESTONE_90', 'ONBOARDING_COMPLETE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'EDUCATION', 'RELIEVING_LETTER', 'BANK_PROOF', 'PHOTO');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'EXTRACTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplianceFormType" AS ENUM ('PF_FORM11', 'PF_FORM2', 'ESI_FORM1');

-- CreateEnum
CREATE TYPE "ComplianceFormStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_GENERATION', 'PENDING_SIGNATURE', 'SIGNED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('DAY1', '30', '60', '90');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'DONE');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL,
    "personal" JSONB NOT NULL,
    "job" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL,
    "extracted" JSONB,
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "storagePath" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceForm" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "ComplianceFormType" NOT NULL,
    "status" "ComplianceFormStatus" NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ComplianceForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "status" "MilestoneStatus" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "checklist" JSONB NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceForm" ADD CONSTRAINT "ComplianceForm_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
