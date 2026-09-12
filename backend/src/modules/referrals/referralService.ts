import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

const REFERRAL_BONUS = 100;

export async function listReferrals(prisma: PrismaClient, userId: string) {
  const items = await prisma.referral.findMany({
    where: { referrerId: userId, NOT: { referredUserId: userId } },
    orderBy: { createdAt: 'desc' },
  });
  return { items };
}

export async function applyReferralCode(prisma: PrismaClient, userId: string, code: string) {
  const referrerUser = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrerUser) throw new HttpError(404, 'Invalid referral code');
  if (referrerUser.id === userId) throw new HttpError(400, 'Cannot refer yourself');

  const existing = await prisma.referral.findUnique({ where: { referredUserId: userId } });
  if (existing && existing.referrerId !== userId) throw new HttpError(409, 'Referral already recorded');

  return prisma.$transaction(async (tx) => {
    const created = existing
      ? await tx.referral.update({ where: { id: existing.id }, data: { referrerId: referrerUser.id, code, status: 'QUALIFIED', qualifiedAt: new Date() } })
      : await tx.referral.create({ data: { referrerId: referrerUser.id, referredUserId: userId, code, status: 'QUALIFIED', qualifiedAt: new Date() } });
    await tx.user.update({ where: { id: userId }, data: { referredByUserId: referrerUser.id } });
    await postLedger(tx, { userId: referrerUser.id, type: 'REFERRAL_REWARD', amount: REFERRAL_BONUS, referralId: created.id });
    return created;
  });
}
