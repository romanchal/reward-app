import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';

export function streakRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => {
    const streak = await prisma.streak.findUnique({ where: { userId: req.user!.id } });
    res.json({
      count: streak?.count ?? 0,
      lastClaimAt: streak?.lastClaimAt ?? null,
    });
  }));
  return router;
}
