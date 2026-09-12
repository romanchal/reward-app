import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { topUsers } from './leaderboardService';

export function leaderboardRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json(await topUsers(prisma, limit));
  }));
  return router;
}
