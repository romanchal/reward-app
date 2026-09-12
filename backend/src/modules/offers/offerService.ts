import type { PrismaClient } from '@prisma/client';

export async function listOffers(prisma: PrismaClient) {
  const items = await prisma.offer.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { provider: { select: { name: true } } },
  });
  return { items };
}
