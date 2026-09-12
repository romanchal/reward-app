import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { applyReferralCode, listReferrals } from './referralService';

const applySchema = z.object({ code: z.string().min(3).max(64) });

export function referralRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => res.json(await listReferrals(prisma, req.user!.id))));
  router.post('/apply', asyncHandler(async (req, res) => {
    const input = applySchema.parse(req.body);
    res.json(await applyReferralCode(prisma, req.user!.id, input.code));
  }));
  return router;
}
