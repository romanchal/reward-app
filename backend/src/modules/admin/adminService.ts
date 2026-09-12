import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';

export async function dashboardMetrics(prisma: PrismaClient) {
  const [users, tasks, completions, withdrawals, pendingWithdrawals, fraudReview, rewards] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.taskCompletion.count(),
    prisma.withdrawal.count(),
    prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    prisma.fraudEvent.count({ where: { status: 'REVIEW' } }),
    prisma.rewardOrder.count(),
  ]);
  const totalBalance = await prisma.wallet.aggregate({ _sum: { balance: true } });
  return {
    users,
    tasks,
    completions,
    withdrawals,
    pendingWithdrawals,
    fraudReview,
    rewardOrders: rewards,
    liabilityBalance: totalBalance._sum.balance ?? 0,
  };
}

export async function listUsers(prisma: PrismaClient, filter: { banned?: boolean } = {}) {
  const items = await prisma.user.findMany({
    where: filter.banned !== undefined ? { banned: filter.banned } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, email: true, name: true, role: true, banned: true, isVerified: true, balance: true, createdAt: true },
  });
  return { items };
}

export async function setUserBanned(prisma: PrismaClient, id: string, banned: boolean) {
  return prisma.user.update({ where: { id }, data: { banned }, select: { id: true, banned: true } });
}

export async function upsertTask(prisma: PrismaClient, id: string | undefined, data: { title: string; description?: string; reward: number; xp?: number; status?: any; dailyLimit?: number; isDemo?: boolean }) {
  if (id) return prisma.task.update({ where: { id }, data });
  return prisma.task.create({ data: { ...data, description: data.description ?? '' } });
}

export async function disableTask(prisma: PrismaClient, id: string) {
  return prisma.task.update({ where: { id }, data: { status: 'PAUSED' } });
}

export async function getSettings(prisma: PrismaClient) {
  const items = await prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
  return { items };
}

export async function updateSetting(prisma: PrismaClient, key: string, value: unknown) {
  if (!key) throw new HttpError(400, 'key required');
  return prisma.appSetting.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}
