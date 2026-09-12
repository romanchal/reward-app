import type { Prisma, PrismaClient, TransactionType } from '@prisma/client';
import { HttpError } from '../../lib/http-error';

export interface LedgerEntry {
  userId: string;
  type: TransactionType;
  amount: number;
  taskId?: string;
  referralId?: string;
  referenceId?: string;
  currency?: string;
}

export async function postLedger(tx: Prisma.TransactionClient, entry: LedgerEntry) {
  const wallet = await tx.wallet.findUnique({ where: { userId: entry.userId } });
  if (!wallet) throw new HttpError(404, 'Wallet not found');
  const nextBalance = wallet.balance + entry.amount;
  if (nextBalance < 0) throw new HttpError(400, 'Insufficient balance');

  const updated = await tx.wallet.update({
    where: { userId: entry.userId },
    data: { balance: nextBalance },
  });

  const txn = await tx.walletTransaction.create({
    data: {
      userId: entry.userId,
      taskId: entry.taskId,
      referralId: entry.referralId,
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency ?? updated.currency,
      balanceAfter: updated.balance,
      referenceId: entry.referenceId,
    },
  });

  await tx.user.update({ where: { id: entry.userId }, data: { balance: updated.balance } });
  return { wallet: updated, transaction: txn };
}

export async function getWallet(prisma: PrismaClient, userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new HttpError(404, 'Wallet not found');
  return wallet;
}

export async function listTransactions(prisma: PrismaClient, userId: string, limit = 50) {
  return prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  });
}
