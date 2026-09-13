import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { createWithdrawal, listUserWithdrawals } from './withdrawalService';
import { writeAudit } from '../../lib/audit';

const createSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  method: z.string().min(2).max(32),
  recipient: z.string().min(3).max(128),
});

export function withdrawalRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => res.json(await listUserWithdrawals(prisma, req.user!.id))));
  router.post('/', asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const created = await createWithdrawal(prisma, req.user!.id, input);
    await writeAudit(prisma, { actorUserId: req.user!.id, action: 'WITHDRAWAL_CREATE', entityType: 'Withdrawal', entityId: created.id, details: { amount: input.amount, method: input.method } });
    res.json(created);
  }));
  return router;
}
