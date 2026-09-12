import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { listFraudEvents, reviewFraudEvent } from './fraudService';

const reviewSchema = z.object({ decision: z.enum(['CLEAN', 'REVIEW', 'SUSPICIOUS', 'BANNED']) });

export function fraudRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => {
    res.json(await listFraudEvents(prisma, { status: req.query.status as string | undefined }));
  }));
  router.post('/:id/review', asyncHandler(async (req, res) => {
    const input = reviewSchema.parse(req.body);
    res.json(await reviewFraudEvent(prisma, String(req.params.id), input.decision));
  }));
  return router;
}
