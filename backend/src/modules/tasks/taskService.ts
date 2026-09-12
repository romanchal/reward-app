import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

export async function listTasks(prisma: PrismaClient) {
  const items = await prisma.task.findMany({
    where: { status: { in: ['LIVE', 'DEMO'] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return { items };
}

export async function completeTask(prisma: PrismaClient, userId: string, taskId: string, idempotencyKey: string) {
  if (!idempotencyKey) throw new HttpError(400, 'idempotencyKey required');
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, 'Task not found');
  if (task.status !== 'LIVE' && task.status !== 'DEMO') throw new HttpError(400, 'Task not available');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing) {
      if (existing.idempotencyKey === idempotencyKey) {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        return { alreadyCompleted: true, balance: wallet?.balance ?? 0 };
      }
      throw new HttpError(409, 'Task already completed');
    }

    await tx.taskCompletion.create({ data: { userId, taskId, idempotencyKey } });
    const { wallet } = await postLedger(tx, {
      userId,
      type: 'TASK_REWARD',
      amount: task.reward,
      taskId,
      referenceId: idempotencyKey,
    });
    if (task.xp) {
      await tx.user.update({ where: { id: userId }, data: { xp: { increment: task.xp } } });
    }
    return { alreadyCompleted: false, balance: wallet.balance, reward: task.reward };
  });
}
