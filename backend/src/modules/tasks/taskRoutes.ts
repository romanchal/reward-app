import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { completeTask, listTasks } from './taskService';

const completeSchema = z.object({ idempotencyKey: z.string().min(1).max(128) });

export function taskRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/', asyncHandler(async (_req, res) => {
    res.json(await listTasks(prisma));
  }));

  router.post('/:id/complete', asyncHandler(async (req, res) => {
    const input = completeSchema.parse(req.body ?? {});
    const result = await completeTask(prisma, req.user!.id, req.params.id, input.idempotencyKey);
    res.json(result);
  }));

  return router;
}
