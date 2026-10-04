import type { ManualPaymentMethod, PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

export interface CreateInput {
  userId: string;
  amount: number;
  currency?: string;
  method: ManualPaymentMethod;
  referenceId: string;
  proofUrl?: string;
  notes?: string;
}

export async function createManualPayment(prisma: PrismaClient, createdById: string, input: CreateInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (input.amount <= 0) throw new HttpError(400, 'Amount must be positive');

  try {
    return await prisma.manualPayment.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        currency: input.currency ?? 'INR',
        method: input.method,
        referenceId: input.referenceId,
        proofUrl: input.proofUrl,
        notes: input.notes,
        createdById,
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new HttpError(409, 'referenceId already used');
    throw err;
  }
}

export async function listManualPayments(prisma: PrismaClient, filter: { status?: string; userId?: string } = {}) {
  const items = await prisma.manualPayment.findMany({
    where: {
      ...(filter.status ? { status: filter.status as any } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return { items };
}

export async function getManualPayment(prisma: PrismaClient, id: string) {
  const item = await prisma.manualPayment.findUnique({
    where: { id },
    include: { },
  });
  if (!item) throw new HttpError(404, 'Not found');
  const user = await prisma.user.findUnique({ where: { id: item.userId }, select: { id: true, name: true, email: true } });
  return { ...item, user };
}

export async function approveManualPayment(prisma: PrismaClient, id: string, approverId: string) {
  const payment = await prisma.manualPayment.findUnique({ where: { id } });
  if (!payment) throw new HttpError(404, 'Not found');
  if (payment.status !== 'PENDING_APPROVAL') throw new HttpError(400, `Cannot approve ${payment.status}`);
  if (payment.createdById === approverId) throw new HttpError(403, 'Maker cannot approve own entry (maker-checker)');

  return prisma.$transaction(async (tx) => {
    await tx.wallet.findUniqueOrThrow({ where: { userId: payment.userId } });
    await postLedger(tx, {
      userId: payment.userId,
      type: 'ADJUSTMENT',
      amount: payment.amount,
      currency: payment.currency,
      referenceId: `mp-${payment.id}`,
    });
    return tx.manualPayment.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
    });
  });
}

export async function rejectManualPayment(prisma: PrismaClient, id: string, approverId: string, reason: string) {
  const payment = await prisma.manualPayment.findUnique({ where: { id } });
  if (!payment) throw new HttpError(404, 'Not found');
  if (payment.status !== 'PENDING_APPROVAL') throw new HttpError(400, `Cannot reject ${payment.status}`);
  if (payment.createdById === approverId) throw new HttpError(403, 'Maker cannot reject own entry');

  return prisma.manualPayment.update({
    where: { id },
    data: { status: 'REJECTED', approvedById: approverId, approvedAt: new Date(), rejectionReason: reason },
  });
}
