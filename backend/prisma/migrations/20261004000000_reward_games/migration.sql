CREATE TYPE "GameType" AS ENUM ('SCRATCH', 'WHEEL');

CREATE TABLE "GamePlay" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "game" "GameType" NOT NULL,
  "playDate" VARCHAR(10) NOT NULL,
  "playNumber" INTEGER NOT NULL,
  "rewardAmount" INTEGER NOT NULL,
  "rewardLabel" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GamePlay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GamePlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GamePlay_userId_game_playDate_playNumber_key"
  ON "GamePlay"("userId", "game", "playDate", "playNumber");

CREATE INDEX "GamePlay_userId_game_playDate_idx"
  ON "GamePlay"("userId", "game", "playDate");