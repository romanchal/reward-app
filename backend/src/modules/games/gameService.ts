import type { GameType, PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

const DAILY_LIMIT: Record<GameType, number> = { SCRATCH: 3, WHEEL: 3 };

interface Tier { amount: number; label: string; weight: number }

const TIERS: Record<GameType, Tier[]> = {
  WHEEL: [
    { amount: 0,   label: 'Try again', weight: 40 },
    { amount: 5,   label: '₹5',        weight: 25 },
    { amount: 10,  label: '₹10',       weight: 15 },
    { amount: 25,  label: '₹25',       weight: 10 },
    { amount: 50,  label: '₹50',       weight: 7 },
    { amount: 100, label: '₹100',      weight: 3 },
  ],
  SCRATCH: [
    { amount: 0,   label: 'No win',   weight: 50 },
    { amount: 10,  label: '₹10',      weight: 25 },
    { amount: 20,  label: '₹20',      weight: 15 },
    { amount: 50,  label: '₹50',      weight: 7 },
    { amount: 100, label: '₹100',     weight: 3 },
  ],
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickTier(game: GameType): Tier {
  const tiers = TIERS[game];
  const total = tiers.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of tiers) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return tiers[0];
}

export async function gameStatus(prisma: PrismaClient, userId: string) {
  const date = todayKey();
  const played = await prisma.gamePlay.groupBy({
    by: ['game'],
    where: { userId, playDate: date },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(played.map((p) => [p.game, p._count._all]));
  return {
    date,
    games: (['SCRATCH', 'WHEEL'] as GameType[]).map((game) => ({
      game,
      limit: DAILY_LIMIT[game],
      used: counts[game] ?? 0,
      remaining: Math.max(0, DAILY_LIMIT[game] - (counts[game] ?? 0)),
      tiers: TIERS[game].map((t) => ({ amount: t.amount, label: t.label })),
    })),
  };
}

export async function playGame(prisma: PrismaClient, userId: string, game: GameType) {
  if (!(game in DAILY_LIMIT)) throw new HttpError(400, 'Unknown game');
  const date = todayKey();
  const tier = pickTier(game);

  return prisma.$transaction(async (tx) => {
    const used = await tx.gamePlay.count({ where: { userId, game, playDate: date } });
    if (used >= DAILY_LIMIT[game]) throw new HttpError(429, `Daily limit for ${game} reached`);
    const playNumber = used + 1;

    const play = await tx.gamePlay.create({
      data: { userId, game, playDate: date, playNumber, rewardAmount: tier.amount, rewardLabel: tier.label },
    });

    if (tier.amount > 0) {
      await postLedger(tx, { userId, type: 'ADJUSTMENT', amount: tier.amount, referenceId: `game-${play.id}` });
    }

    return {
      play: { id: play.id, game, playNumber, playDate: date },
      reward: { amount: tier.amount, label: tier.label, won: tier.amount > 0 },
      remaining: DAILY_LIMIT[game] - playNumber,
    };
  });
}

export async function gameHistory(prisma: PrismaClient, userId: string, game?: GameType, limit = 20) {
  const items = await prisma.gamePlay.findMany({
    where: { userId, ...(game ? { game } : {}) },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  });
  return { items };
}
