import type { PrismaClient } from '@prisma/client';

export async function topUsers(prisma: PrismaClient, limit = 50) {
  const items = await prisma.user.findMany({
    where: { banned: false },
    orderBy: [{ xp: 'desc' }, { balance: 'desc' }],
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true, name: true, xp: true, level: true, balance: true },
  });
  return { items };
}
