import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, HttpError } from '../../lib/http-error';
import { gameHistory, gameStatus, playGame } from './gameService';

const gameSchema = z.enum(['SCRATCH', 'WHEEL']);

export function gameRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/status', asyncHandler(async (req, res) => {
    res.json(await gameStatus(prisma, req.user!.id));
  }));

  router.post('/:game/play', asyncHandler(async (req, res) => {
    const game = gameSchema.parse(String(req.params.game).toUpperCase());
    res.json(await playGame(prisma, req.user!.id, game));
  }));

  router.get('/history', asyncHandler(async (req, res) => {
    const game = req.query.game ? gameSchema.parse(String(req.query.game).toUpperCase()) : undefined;
    const limit = Number(req.query.limit ?? 20);
    res.json(await gameHistory(prisma, req.user!.id, game, limit));
  }));

  return router;
}
