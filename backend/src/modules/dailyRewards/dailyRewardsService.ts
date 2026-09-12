import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_REWARD = 20;

function isSameDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

export async function claimDaily(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  const now = new Date();
  if (user.lastDailyRewardAt && isSameDay(user.lastDailyRewardAt, now)) {
    return { rewarded: false, reason: 'Already claimed today' };
  }

  return prisma.$transaction(async (tx) => {
    const streak = await tx.streak.findUnique({ where: { userId } });
    const previous = streak?.lastClaimAt ?? null;
    const withinWindow = previous ? now.getTime() - previous.getTime() <= 2 * DAY_MS : false;
    const nextCount = withinWindow ? (streak?.count ?? 0) + 1 : 1;

    if (streak) {
      await tx.streak.update({ where: { userId }, data: { count: nextCount, lastClaimAt: now } });
    } else {
      await tx.streak.create({ data: { userId, count: nextCount, lastClaimAt: now } });
    }

    await postLedger(tx, { userId, type: 'DAILY_REWARD', amount: DAILY_REWARD, referenceId: `daily-${now.toISOString().slice(0, 10)}` });
    await tx.user.update({ where: { id: userId }, data: { lastDailyRewardAt: now } });
    return { rewarded: true, amount: DAILY_REWARD, streak: nextCount };
  });
}
