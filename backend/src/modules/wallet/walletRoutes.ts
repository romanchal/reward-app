import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { getWallet, listTransactions } from './walletService';

export function walletRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await getWallet(prisma, req.user!.id));
  }));

  router.get('/transactions', asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const items = await listTransactions(prisma, req.user!.id, limit);
    res.json({ items });
  }));

  return router;
}
