import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { listRewards, listUserOrders, orderReward } from './rewardService';

const orderSchema = z.object({ rewardId: z.string().min(1) });

export function rewardRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (_req, res) => res.json(await listRewards(prisma))));
  router.get('/orders', asyncHandler(async (req, res) => res.json(await listUserOrders(prisma, req.user!.id))));
  router.post('/order', asyncHandler(async (req, res) => {
    const input = orderSchema.parse(req.body);
    res.json(await orderReward(prisma, req.user!.id, input.rewardId));
  }));
  return router;
}
