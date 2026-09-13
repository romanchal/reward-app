import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { listRewards, listUserOrders, orderReward } from './rewardService';
import { writeAudit } from '../../lib/audit';

const orderSchema = z.object({ rewardId: z.string().min(1) });

export function rewardRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (_req, res) => res.json(await listRewards(prisma))));
  router.get('/orders', asyncHandler(async (req, res) => res.json(await listUserOrders(prisma, req.user!.id))));
  router.post('/order', asyncHandler(async (req, res) => {
    const input = orderSchema.parse(req.body);
    const created = await orderReward(prisma, req.user!.id, input.rewardId);
    await writeAudit(prisma, { actorUserId: req.user!.id, action: 'REWARD_ORDER', entityType: 'RewardOrder', entityId: created.id, details: { rewardId: input.rewardId } });
    res.json(created);
  }));
  return router;
}
