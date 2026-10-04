ALTER TABLE "Withdrawal" ADD COLUMN "providerRef" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "providerPayload" JSONB;
CREATE UNIQUE INDEX "Withdrawal_providerRef_key" ON "Withdrawal"("providerRef");
