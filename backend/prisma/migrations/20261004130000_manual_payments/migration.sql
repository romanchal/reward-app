CREATE TYPE "ManualPaymentMethod" AS ENUM ('CASH', 'BANK', 'CHEQUE', 'UPI', 'OTHER');
CREATE TYPE "ManualPaymentStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MANUAL_PAYMENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MANUAL_PAYMENT_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MANUAL_PAYMENT_REJECT';

CREATE TABLE "ManualPayment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "method" "ManualPaymentMethod" NOT NULL,
  "referenceId" TEXT NOT NULL UNIQUE,
  "proofUrl" TEXT,
  "notes" TEXT,
  "status" "ManualPaymentStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "ManualPayment_userId_status_createdAt_idx" ON "ManualPayment"("userId", "status", "createdAt");
CREATE INDEX "ManualPayment_status_createdAt_idx" ON "ManualPayment"("status", "createdAt");
