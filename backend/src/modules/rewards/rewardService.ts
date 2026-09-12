import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

export async function listRewards(prisma: PrismaClient) {
  const items = await prisma.reward.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: { value: 'asc' },
  });
  return { items };
}

export async function orderReward(prisma: PrismaClient, userId: string, rewardId: string) {
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) throw new HttpError(404, 'Reward not found');
  if (reward.status !== 'AVAILABLE') throw new HttpError(400, 'Reward unavailable');

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < reward.value) throw new HttpError(400, 'Insufficient balance');

    await postLedger(tx, { userId, type: 'REWARD_ORDER', amount: -reward.value, referenceId: reward.id });
    return tx.rewardOrder.create({
      data: { userId, rewardId: reward.id, amount: reward.value, status: 'PENDING' },
    });
  });
}

export async function listUserOrders(prisma: PrismaClient, userId: string) {
  const items = await prisma.rewardOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { reward: true },
  });
  return { items };
}
