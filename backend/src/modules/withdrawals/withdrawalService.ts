import type { PrismaClient, WithdrawalStatus, Withdrawal } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';
import { encryptString, safeDecrypt } from '../../lib/crypto';
import { initiatePayout, isConfigured as razorpayConfigured, mapProviderStatus } from './razorpay';

const MIN_WITHDRAWAL = Number(process.env.WITHDRAWAL_MIN ?? 100);
const MAX_WITHDRAWAL = Number(process.env.WITHDRAWAL_MAX ?? 100000);
const DAILY_WITHDRAWAL_LIMIT = Number(process.env.WITHDRAWAL_DAILY_LIMIT ?? 200000);

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
  if (input.amount > MAX_WITHDRAWAL) throw new HttpError(400, `Maximum single withdrawal is ${MAX_WITHDRAWAL}`);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailySum = await prisma.withdrawal.aggregate({
    where: { userId, createdAt: { gte: since }, status: { notIn: ['REJECTED', 'FAILED'] } },
    _sum: { amount: true },
  });
  const dailyUsed = dailySum._sum.amount ?? 0;
  if (dailyUsed + input.amount > DAILY_WITHDRAWAL_LIMIT) {
    throw new HttpError(400, `Daily withdrawal limit (${DAILY_WITHDRAWAL_LIMIT}) exceeded`);
  }

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
    if ((next === 'REJECTED' || next === 'FAILED') && withdrawal.status !== 'REJECTED' && withdrawal.status !== 'FAILED') {
      await postLedger(tx, { userId: withdrawal.userId, type: 'ADJUSTMENT', amount: withdrawal.amount, referenceId: `refund-${id}` });
    }
    return updated;
  });
}

export async function approveAndPayout(prisma: PrismaClient, id: string, reason?: string) {
  const approved = await transitionWithdrawal(prisma, id, 'APPROVED', reason);
  if (!razorpayConfigured()) return approved;
  try {
    const w = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    const payout = await initiatePayout({
      withdrawalId: w.id,
      amount: w.amount,
      currency: w.currency,
      method: w.method,
      recipient: safeDecrypt(w.recipient) ?? '',
      idempotencyKey: `wd-${w.id}`,
    });
    const processing = await transitionWithdrawal(prisma, id, 'PROCESSING');
    await prisma.withdrawal.update({
      where: { id },
      data: { providerRef: payout.providerRef, providerPayload: payout.raw as any },
    });
    return processing;
  } catch (err) {
    await transitionWithdrawal(prisma, id, 'REJECTED', err instanceof Error ? err.message : 'provider error').catch(() => undefined);
    throw err;
  }
}

export async function applyWebhookEvent(prisma: PrismaClient, providerRef: string, providerStatus: string, payload: unknown) {
  const w = await prisma.withdrawal.findUnique({ where: { providerRef } });
  if (!w) return { skipped: true, reason: 'unknown providerRef' };
  const next = mapProviderStatus(providerStatus);
  if (!next || next === w.status) return { skipped: true, reason: 'no transition' };
  await prisma.withdrawal.update({ where: { id: w.id }, data: { providerPayload: payload as any } });
  const terminal: WithdrawalStatus[] = ['COMPLETED', 'FAILED', 'REJECTED'];
  if (terminal.includes(w.status)) return { skipped: true, reason: 'already terminal' };
  return transitionWithdrawal(prisma, w.id, next, `razorpay:${providerStatus}`);
}

export async function bulkApprove(prisma: PrismaClient, ids: string[]) {
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of ids) {
    try { await approveAndPayout(prisma, id); results.push({ id, ok: true }); }
    catch (e) { results.push({ id, ok: false, error: e instanceof Error ? e.message : 'failed' }); }
  }
  return { results };
}
