import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { claimDaily } from './dailyRewardsService';

export function dailyRewardsRoutes(prisma: PrismaClient) {
  const router = Router();
  router.post('/', asyncHandler(async (req, res) => {
    res.json(await claimDaily(prisma, req.user!.id));
  }));
  return router;
}
