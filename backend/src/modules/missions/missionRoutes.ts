import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { completeMission, listMissions } from './missionService';

export function missionRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await listMissions(prisma, req.user!.id));
  }));

  router.post('/:id/complete', asyncHandler(async (req, res) => {
    res.json(await completeMission(prisma, req.user!.id, req.params.id));
  }));

  return router;
}
