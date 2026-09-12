import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { listOffers } from './offerService';
import { syncProviderOffers } from './providerRegistry';

export function offerRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/', asyncHandler(async (_req, res) => res.json(await listOffers(prisma))));
  router.post('/sync', asyncHandler(async (_req, res) => res.json(await syncProviderOffers(prisma))));
  return router;
}
