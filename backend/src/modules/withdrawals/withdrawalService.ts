import type { PrismaClient, WithdrawalStatus, Withdrawal } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';
import { encryptString, safeDecrypt } from '../../lib/crypto';

const MIN_WITHDRAWAL = 100;

function maskRecipient(plain: string | null): string {
  if (!plain) return '';
  if (plain.length <= 4) return '****';
  return `${plain.slice(0, 2)}****${plain.slice(-2)}`;
}

function decryptWithdrawal<T extends Withdrawal>(w: T, reveal: boolean): T {
  const plain = safeDecrypt(w.recipient);
  return { ...w, recipient: reveal ? (plain ?? '') : maskRecipient(plain) } as T;
}

export interface WithdrawalInput {
  amount: number;
  currency?: string;
  method: string;
  recipient: string;
}

export async function createWithdrawal(prisma: PrismaClient, userId: string, input: WithdrawalInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.isVerified) throw new HttpError(403, 'Account not verified for withdrawals');
  if (input.amount < MIN_WITHDRAWAL) throw new HttpError(400, `Minimum withdrawal is ${MIN_WITHDRAWAL}`);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < input.amount) throw new HttpError(400, 'Insufficient balance');
    await postLedger(tx, { userId, type: 'WITHDRAWAL', amount: -input.amount, referenceId: `wd-${Date.now()}` });
    return tx.withdrawal.create({
      data: {
        userId,
        amount: input.amount,
        currency: input.currency ?? wallet.currency,
        method: input.method,
        recipient: encryptString(input.recipient),
        status: 'PENDING',
      },
    });
  });
}

export async function listUserWithdrawals(prisma: PrismaClient, userId: string) {
  const items = await prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return { items: items.map((w) => decryptWithdrawal(w, false)) };
}

export async function listAllWithdrawals(prisma: PrismaClient, status?: WithdrawalStatus) {
  const items = await prisma.withdrawal.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  return { items: items.map((w) => ({ ...decryptWithdrawal(w, true), user: w.user })) };
}

export async function transitionWithdrawal(prisma: PrismaClient, id: string, next: WithdrawalStatus, reason?: string) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) throw new HttpError(404, 'Withdrawal not found');

  const allowed: Record<WithdrawalStatus, WithdrawalStatus[]> = {
    PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSING', 'REJECTED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    FAILED: [],
    REJECTED: [],
  };
  if (!allowed[withdrawal.status].includes(next)) {
    throw new HttpError(400, `Cannot transition ${withdrawal.status} -> ${next}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawal.update({
      where: { id },
      data: { status: next, reviewReason: reason ?? withdrawal.reviewReason, processedAt: ['COMPLETED', 'FAILED', 'REJECTED'].includes(next) ? new Date() : null },
    });
    if (next === 'REJECTED' || next === 'FAILED') {
      await postLedger(tx, { userId: withdrawal.userId, type: 'ADJUSTMENT', amount: withdrawal.amount, referenceId: `refund-${id}` });
    }
    return updated;
  });
}
