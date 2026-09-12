import type { PrismaClient } from '@prisma/client';

export async function listFraudEvents(prisma: PrismaClient, filter: { status?: string } = {}) {
  const items = await prisma.fraudEvent.findMany({
    where: filter.status ? { status: filter.status as any } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  return { items };
}

export async function reviewFraudEvent(prisma: PrismaClient, id: string, decision: 'CLEAN' | 'REVIEW' | 'SUSPICIOUS' | 'BANNED') {
  const updated = await prisma.fraudEvent.update({
    where: { id },
    data: { status: decision, reviewedAt: new Date() },
  });
  if (decision === 'BANNED') {
    await prisma.user.update({ where: { id: updated.userId }, data: { banned: true } });
  }
  return updated;
}
