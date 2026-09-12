CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'EXPIRED', 'DEMO');
CREATE TYPE "TransactionType" AS ENUM ('TASK_REWARD', 'REFERRAL_REWARD', 'DAILY_REWARD', 'MISSION_REWARD', 'REWARD_ORDER', 'WITHDRAWAL', 'ADJUSTMENT');
CREATE TYPE "TransactionStatus" AS ENUM ('POSTED', 'ADJUSTMENT', 'FAILED');
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');
CREATE TYPE "OfferCallbackStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REJECTED');
CREATE TYPE "MissionStatus" AS ENUM ('OPEN', 'COMPLETE', 'EXPIRED');
CREATE TYPE "RewardStatus" AS ENUM ('AVAILABLE', 'CLAIMED', 'FULFILLED', 'EXPIRED');
CREATE TYPE "RewardOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'FULFILLED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'READ', 'UNREAD');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
CREATE TYPE "FraudStatus" AS ENUM ('CLEAN', 'REVIEW', 'SUSPICIOUS', 'BANNED');
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'REGISTER', 'REFRESH', 'LOGOUT', 'TASK_COMPLETE', 'REWARD_ORDER', 'WITHDRAWAL_CREATE', 'WITHDRAWAL_APPROVE', 'WITHDRAWAL_REJECT', 'WITHDRAWAL_COMPLETE', 'USER_SUSPEND', 'USER_RESTORE', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DISABLE', 'SETTINGS_UPDATE', 'FRAUD_REVIEW');
CREATE TYPE "LeaderboardPeriod" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "emailNormalized" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "banned" BOOLEAN NOT NULL DEFAULT false,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "pendingBalance" INTEGER NOT NULL DEFAULT 0,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "referralCode" TEXT NOT NULL UNIQUE,
  "referredByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "lastLoginAt" TIMESTAMPTZ,
  "lastDailyRewardAt" TIMESTAMPTZ
);
CREATE TABLE "Session" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "expiresAt" TIMESTAMPTZ NOT NULL);
CREATE TABLE "RefreshToken" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "tokenHash" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "expiresAt" TIMESTAMPTZ NOT NULL, "revokedAt" TIMESTAMPTZ);
CREATE TABLE "Wallet" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE, "balance" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'INR', "updatedAt" TIMESTAMPTZ NOT NULL);
CREATE TABLE "WalletTransaction" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "taskId" TEXT, "referralId" TEXT, "type" "TransactionType" NOT NULL, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL, "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED', "balanceAfter" INTEGER NOT NULL, "referenceId" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "Task" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "reward" INTEGER NOT NULL, "xp" INTEGER NOT NULL, "country" TEXT NOT NULL DEFAULT 'IN', "status" "TaskStatus" NOT NULL DEFAULT 'LIVE', "isDemo" BOOLEAN NOT NULL DEFAULT false, "dailyLimit" INTEGER NOT NULL DEFAULT 1, "totalLimit" INTEGER, "startsAt" TIMESTAMPTZ, "expiresAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL);
CREATE TABLE "TaskCompletion" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE, "idempotencyKey" TEXT NOT NULL, "completedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("userId", "taskId"), UNIQUE("userId", "taskId", "idempotencyKey"));
CREATE TABLE "OfferProvider" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "Offer" ("id" TEXT PRIMARY KEY, "providerId" TEXT NOT NULL REFERENCES "OfferProvider"("id") ON DELETE CASCADE, "providerOfferId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "reward" INTEGER NOT NULL, "url" TEXT NOT NULL, "country" TEXT NOT NULL DEFAULT 'IN', "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE', "startsAt" TIMESTAMPTZ, "expiresAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("providerId", "providerOfferId"));
CREATE TABLE "OfferCallback" ("id" TEXT PRIMARY KEY, "providerId" TEXT NOT NULL REFERENCES "OfferProvider"("id") ON DELETE CASCADE, "callbackId" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "status" "OfferCallbackStatus" NOT NULL DEFAULT 'PENDING', "payload" JSONB, "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "verifiedAt" TIMESTAMPTZ);
CREATE TABLE "Referral" ("id" TEXT PRIMARY KEY, "referrerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "referredUserId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE, "code" TEXT NOT NULL UNIQUE, "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "qualifiedAt" TIMESTAMPTZ);
CREATE TABLE "Mission" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "target" INTEGER NOT NULL, "reward" INTEGER NOT NULL, "status" "MissionStatus" NOT NULL DEFAULT 'OPEN', "isDemo" BOOLEAN NOT NULL DEFAULT true, "startsAt" TIMESTAMPTZ, "expiresAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "MissionProgress" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "missionId" TEXT NOT NULL REFERENCES "Mission"("id") ON DELETE CASCADE, "progress" INTEGER NOT NULL DEFAULT 0, "completedAt" TIMESTAMPTZ, UNIQUE("userId", "missionId"));
CREATE TABLE "Streak" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE, "count" INTEGER NOT NULL DEFAULT 0, "lastClaimAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL);
CREATE TABLE "Level" ("level" INTEGER PRIMARY KEY, "requiredXp" INTEGER NOT NULL UNIQUE, "reward" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "Badge" ("code" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "threshold" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "UserBadge" ("userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "badgeCode" TEXT NOT NULL REFERENCES "Badge"("id") ON DELETE CASCADE, "awardedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY ("userId", "badgeCode"));
CREATE TABLE "Leaderboard" ("id" TEXT PRIMARY KEY, "period" "LeaderboardPeriod" NOT NULL, "name" TEXT NOT NULL, "reward" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "startsAt" TIMESTAMPTZ, "endsAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("period"));
CREATE TABLE "LeaderboardEntry" ("id" TEXT PRIMARY KEY, "leaderboardId" TEXT NOT NULL REFERENCES "Leaderboard"("id") ON DELETE CASCADE, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "score" INTEGER NOT NULL, "rank" INTEGER NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("leaderboardId", "userId"));
CREATE TABLE "Reward" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "value" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR', "status" "RewardStatus" NOT NULL DEFAULT 'AVAILABLE', "isDemo" BOOLEAN NOT NULL DEFAULT false, "redemptionCode" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "RewardOrder" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "rewardId" TEXT NOT NULL REFERENCES "Reward"("id") ON DELETE RESTRICT, "amount" INTEGER NOT NULL, "status" "RewardOrderStatus" NOT NULL DEFAULT 'PENDING', "fulfillmentReference" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "fulfilledAt" TIMESTAMPTZ);
CREATE TABLE "Withdrawal" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL, "method" TEXT NOT NULL, "recipient" TEXT NOT NULL, "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING', "reviewReason" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "processedAt" TIMESTAMPTZ);
CREATE TABLE "Notification" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "type" TEXT NOT NULL, "body" TEXT NOT NULL, "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "readAt" TIMESTAMPTZ);
CREATE TABLE "SupportTicket" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "subject" TEXT NOT NULL, "message" TEXT NOT NULL, "status" "TicketStatus" NOT NULL DEFAULT 'OPEN', "priority" TEXT NOT NULL DEFAULT 'NORMAL', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL);
CREATE TABLE "FraudEvent" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "type" TEXT NOT NULL, "severity" TEXT NOT NULL, "score" INTEGER NOT NULL, "status" "FraudStatus" NOT NULL DEFAULT 'CLEAN', "details" JSONB, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "reviewedAt" TIMESTAMPTZ);
CREATE TABLE "RiskScore" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "score" INTEGER NOT NULL, "reasons" JSON NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "AdminUser" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL, "role" "UserRole" NOT NULL DEFAULT 'ADMIN', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "lastLoginAt" TIMESTAMPTZ);
CREATE TABLE "AdminRole" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "description" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "AuditLog" ("id" TEXT PRIMARY KEY, "actorUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL, "action" "AuditAction" NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "details" JSONB, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "AppSetting" ("key" TEXT PRIMARY KEY, "value" JSON NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL);
CREATE TABLE "Campaign" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT', "channels" JSON NOT NULL DEFAULT '[]', "startsAt" TIMESTAMPTZ, "endsAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");
CREATE INDEX "Offer_status_expiresAt_idx" ON "Offer"("status", "expiresAt");
CREATE INDEX "OfferCallback_providerId_status_idx" ON "OfferCallback"("providerId", "status");
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");
CREATE INDEX "LeaderboardEntry_leaderboardId_rank_idx" ON "LeaderboardEntry"("leaderboardId", "rank");
CREATE INDEX "Withdrawal_userId_status_createdAt_idx" ON "Withdrawal"("userId", "status", "createdAt");
CREATE INDEX "Withdrawal_status_createdAt_idx" ON "Withdrawal"("status", "createdAt");
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");
CREATE INDEX "FraudEvent_userId_status_createdAt_idx" ON "FraudEvent"("userId", "status", "createdAt");
CREATE INDEX "RiskScore_userId_createdAt_idx" ON "RiskScore"("userId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
