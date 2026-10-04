import { Router } from 'express';
import { z } from 'zod';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { rateLimit } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../db';
import { signAccessToken, signRefreshToken } from '../lib/auth';
import bcrypt from 'bcryptjs';
import { clearRedisCache } from '../lib/redis';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional(),
});

const googleCredentialSchema = z.object({ credential: z.string().min(1).max(8192) });
const telegramAuthSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d{1,20}$/)]).transform(String),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().max(100).optional(),
  username: z.string().trim().max(100).optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().regex(/^[a-f\d]{64}$/i),
}).passthrough();

type SocialProvider = 'GOOGLE' | 'TELEGRAM';
type SocialUser = { id: string; email: string; name: string; role: string; banned: boolean };

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function findLinkedSocialUser(provider: SocialProvider, providerUserId: string) {
  return prisma.socialAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    include: { user: true },
  });
}

async function attachSocialAccount(user: SocialUser, provider: SocialProvider, providerUserId: string): Promise<SocialUser> {
  try {
    await prisma.socialAccount.create({ data: { provider, providerUserId, userId: user.id } });
    return user;
  } catch (error) {
    const linked = await findLinkedSocialUser(provider, providerUserId);
    if (linked) return linked.user;
    throw error;
  }
}

async function findOrCreateSocialUser(
  provider: SocialProvider,
  providerUserId: string,
  name: string,
  verifiedEmail?: string,
): Promise<SocialUser> {
  const linked = await findLinkedSocialUser(provider, providerUserId);
  if (linked) return linked.user;

  const email = verifiedEmail?.trim().toLowerCase();
  const existing = email ? await prisma.user.findUnique({ where: { emailNormalized: email } }) : null;
  if (existing) {
    if (existing.banned) return existing;
    if (email && !existing.isVerified) {
      await prisma.user.update({ where: { id: existing.id }, data: { isVerified: true } });
    }
    return attachSocialAccount(existing, provider, providerUserId);
  }

  const accountEmail = email ?? `telegram-${providerUserId}-${randomBytes(16).toString('hex')}@telegram.invalid`;
  try {
    return await prisma.user.create({
      data: {
        name: name.trim().slice(0, 100) || 'Reward User',
        email: accountEmail,
        emailNormalized: accountEmail,
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
        role: 'USER',
        isVerified: Boolean(email),
        socialAccounts: { create: { provider, providerUserId } },
        wallet: { create: {} },
      },
    });
  } catch (error) {
    const racedIdentity = await findLinkedSocialUser(provider, providerUserId);
    if (racedIdentity) return racedIdentity.user;
    if (email && isUniqueConstraintError(error)) {
      const racedEmail = await prisma.user.findUnique({ where: { emailNormalized: email } });
      if (racedEmail) return attachSocialAccount(racedEmail, provider, providerUserId);
    }
    throw error;
  }
}

function sendSocialSession(res: import('express').Response, user: SocialUser, email = user.email) {
  const accessToken = signAccessToken(user, process.env.JWT_SECRET ?? 'local-change-me');
  const refreshToken = signRefreshToken(user, process.env.JWT_REFRESH_SECRET ?? 'local-refresh-change-me');
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', secure });
  res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', secure, maxAge: 30 * 24 * 60 * 60 * 1000 });
  return res.json({
    success: true,
    data: { userId: user.id, role: user.role, token: accessToken },
    accessToken,
    user: { id: user.id, name: user.name, email, role: user.role },
  });
}

const taskVerifySchema = z.object({
  taskId: z.string().min(1),
  verificationRef: z.string().min(1),
});

const gamePrizeSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(40),
  amount: z.number().int().min(0).max(10000),
  weight: z.number().int().min(1).max(1000000),
});

const secureHttpsUrl = z.string().trim().url().max(1000).refine((value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Banner URLs must use HTTPS.');

const rewardBannerSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(100),
  imageUrl: secureHttpsUrl,
  targetUrl: secureHttpsUrl,
  placement: z.enum(['HOME', 'REWARDS']),
  enabled: z.boolean(),
});

const gameConfigSchema = z.object({
  scratchPrizes: z.array(gamePrizeSchema).min(1).max(12),
  wheelPrizes: z.array(gamePrizeSchema).min(1).max(12),
  banners: z.array(rewardBannerSchema).max(20),
}).superRefine((config, context) => {
  for (const [key, prizes] of Object.entries({ scratchPrizes: config.scratchPrizes, wheelPrizes: config.wheelPrizes })) {
    const ids = prizes.map((prize) => prize.id);
    if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: [key], message: 'Prize IDs must be unique.' });
    if (prizes.reduce((sum, prize) => sum + prize.weight, 0) > 1000000) {
      context.addIssue({ code: 'custom', path: [key], message: 'Combined prize weight cannot exceed 1,000,000.' });
    }
  }
  const bannerIds = config.banners.map((banner) => banner.id);
  if (new Set(bannerIds).size !== bannerIds.length) context.addIssue({ code: 'custom', path: ['banners'], message: 'Banner IDs must be unique.' });
});

type GameConfig = z.infer<typeof gameConfigSchema>;
type GamePrize = z.infer<typeof gamePrizeSchema>;
const gameConfigKey = 'rewards.game-config';
const dailyGameLimit = 10;
const defaultGameConfig: GameConfig = {
  scratchPrizes: [
    { id: 'scratch-5', label: '5 credits', amount: 5, weight: 50 },
    { id: 'scratch-10', label: '10 credits', amount: 10, weight: 30 },
    { id: 'scratch-20', label: '20 credits', amount: 20, weight: 15 },
    { id: 'scratch-50', label: '50 credits', amount: 50, weight: 5 },
  ],
  wheelPrizes: [
    { id: 'wheel-2', label: '2 credits', amount: 2, weight: 40 },
    { id: 'wheel-5', label: '5 credits', amount: 5, weight: 30 },
    { id: 'wheel-10', label: '10 credits', amount: 10, weight: 20 },
    { id: 'wheel-25', label: '25 credits', amount: 25, weight: 10 },
  ],
  banners: [],
};

async function readGameConfig(): Promise<GameConfig> {
  const setting = await prisma.appSetting.findUnique({ where: { key: gameConfigKey } });
  return setting ? gameConfigSchema.parse(setting.value) : defaultGameConfig;
}

function choosePrize(prizes: GamePrize[]): GamePrize {
  const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let selection = randomInt(totalWeight);
  for (const prize of prizes) {
    selection -= prize.weight;
    if (selection < 0) return prize;
  }
  return prizes[prizes.length - 1];
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type YonoPromoRecord = {
  id: string;
  code: string;
  title: string;
  description: string;
  terms: string | null;
  expiresAt: string | null;
  sourceUrl: string | null;
  active: boolean;
  createdAt: string;
};

const yonoPromoInput = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  terms: z.string().trim().max(1000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  sourceUrl: z.string().url().max(500).nullable().optional(),
});

async function readYonoPromoRecords(): Promise<YonoPromoRecord[]> {
  const events = await prisma.auditLog.findMany({
    where: { entityType: 'YonoRummyPromo', action: { in: ['YONO_PROMO_UPSERT', 'YONO_PROMO_DELETE'] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1000,
  });
  const latest = new Map<string, YonoPromoRecord>();

  for (const event of events) {
    if (!event.details || typeof event.details !== 'object' || Array.isArray(event.details)) continue;
    const details = event.details as Record<string, unknown>;
    const id = typeof details.id === 'string' ? details.id : event.entityId;
    if (latest.has(id)) continue;
    if (typeof details.code !== 'string') continue;

    latest.set(id, {
      id,
      code: details.code,
      title: typeof details.title === 'string' ? details.title : 'Yono Rummy bonus',
      description: typeof details.description === 'string' ? details.description : '',
      terms: typeof details.terms === 'string' ? details.terms : null,
      expiresAt: typeof details.expiresAt === 'string' ? details.expiresAt : null,
      sourceUrl: typeof details.sourceUrl === 'string' ? details.sourceUrl : null,
      active: event.action !== 'YONO_PROMO_DELETE' && details.active !== false,
      createdAt: event.createdAt.toISOString(),
    });
  }

  return [...latest.values()];
}

router.get('/promos/yono-rummy', async (_req, res) => {
  const now = Date.now();
  const promos = (await readYonoPromoRecords())
    .filter((promo) => promo.active && (!promo.expiresAt || new Date(promo.expiresAt).getTime() > now))
    .sort((left, right) => (left.expiresAt ?? '9999').localeCompare(right.expiresAt ?? '9999'));
  return res.json({ success: true, data: promos });
});

router.get('/rewards/config', async (_req, res) => {
  const config = await readGameConfig();
  return res.json({
    success: true,
    data: {
      dailyLimit: dailyGameLimit,
      scratchPrizes: config.scratchPrizes,
      wheelPrizes: config.wheelPrizes,
      banners: config.banners.filter((banner) => banner.enabled),
    },
  });
});

router.get('/rewards/games/state', authMiddleware(prisma), async (req, res) => {
  const playDate = new Date().toISOString().slice(0, 10);
  const [scratchPlays, spinPlays, lastScratch, lastSpin] = await Promise.all([
    prisma.gamePlay.count({ where: { userId: req.user!.id, game: 'SCRATCH', playDate } }),
    prisma.gamePlay.count({ where: { userId: req.user!.id, game: 'WHEEL', playDate } }),
    prisma.gamePlay.findFirst({ where: { userId: req.user!.id, game: 'SCRATCH', playDate }, orderBy: { playNumber: 'desc' } }),
    prisma.gamePlay.findFirst({ where: { userId: req.user!.id, game: 'WHEEL', playDate }, orderBy: { playNumber: 'desc' } }),
  ]);
  return res.json({
    success: true,
    data: {
      day: playDate,
      dailyLimit: dailyGameLimit,
      scratchPlays,
      spinPlays,
      scratchPrize: lastScratch ? { label: lastScratch.rewardLabel, amount: lastScratch.rewardAmount } : null,
      spinPrize: lastSpin ? { label: lastSpin.rewardLabel, amount: lastSpin.rewardAmount } : null,
    },
  });
});

router.post('/rewards/games/:game/play', authMiddleware(prisma), rateLimit, async (req, res) => {
  const parsedGame = z.enum(['scratch', 'wheel']).safeParse(req.params.game);
  if (!parsedGame.success) return res.status(404).json({ success: false, message: 'Unknown reward game' });

  const game = parsedGame.data === 'scratch' ? 'SCRATCH' : 'WHEEL';
  const config = await readGameConfig();
  const prize = choosePrize(game === 'SCRATCH' ? config.scratchPrizes : config.wheelPrizes);
  const playDate = new Date().toISOString().slice(0, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const playsToday = await tx.gamePlay.count({ where: { userId: req.user!.id, game, playDate } });
      if (playsToday >= dailyGameLimit) return { limited: true as const };

      const playNumber = playsToday + 1;
      const play = await tx.gamePlay.create({
        data: { userId: req.user!.id, game, playDate, playNumber, rewardAmount: prize.amount, rewardLabel: prize.label },
      });
      const wallet = await tx.wallet.upsert({
        where: { userId: req.user!.id },
        create: { userId: req.user!.id, balance: 0, currency: 'INR' },
        update: {},
      });
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: prize.amount } },
      });
      await tx.user.update({ where: { id: req.user!.id }, data: { balance: { increment: prize.amount } } });
      await tx.walletTransaction.create({
        data: {
          userId: req.user!.id,
          walletId: wallet.id,
          type: 'DAILY_REWARD',
          amount: prize.amount,
          currency: wallet.currency,
          status: 'POSTED',
          balanceAfter: updatedWallet.balance,
          referenceId: `gameplay:${play.id}`,
        },
      });

      return { limited: false as const, playNumber, reward: prize, balance: updatedWallet.balance, game: parsedGame.data };
    });

    if (result.limited) return res.status(429).json({ success: false, message: 'Daily play limit reached', data: { dailyLimit: dailyGameLimit } });
    return res.json({ success: true, data: { ...result, dailyLimit: dailyGameLimit } });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A game play was already recorded. Refresh the game state and retry.' });
    }
    console.error('Reward game play failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to complete reward game' });
  }
});

router.get('/admin/promos/yono-rummy', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  return res.json({ success: true, data: await readYonoPromoRecords() });
});

router.post('/admin/promos/yono-rummy', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  const input = yonoPromoInput.parse(req.body ?? {});
  const records = await readYonoPromoRecords();
  const existing = records.find((promo) => promo.code.toUpperCase() === input.code.toUpperCase());
  const id = existing?.id ?? makeId('yono_promo');
  const promo: YonoPromoRecord = {
    id,
    code: input.code,
    title: input.title ?? 'Yono Rummy bonus',
    description: input.description ?? '',
    terms: input.terms ?? null,
    expiresAt: input.expiresAt ?? null,
    sourceUrl: input.sourceUrl ?? null,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: 'YONO_PROMO_UPSERT',
      entityType: 'YonoRummyPromo',
      entityId: id,
      details: promo,
    },
  });
  return res.status(existing ? 200 : 201).json({ success: true, data: promo });
});

router.delete('/admin/promos/yono-rummy/:id', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  const existing = (await readYonoPromoRecords()).find((promo) => promo.id === req.params.id && promo.active);
  if (!existing) return res.status(404).json({ success: false, message: 'Promo code not found' });

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: 'YONO_PROMO_DELETE',
      entityType: 'YonoRummyPromo',
      entityId: existing.id,
      details: { ...existing, active: false },
    },
  });
  return res.json({ success: true, data: { id: existing.id, active: false } });
});

router.post('/auth/google', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return res.status(503).json({ success: false, message: 'Google sign-in is not configured' });

  const input = googleCredentialSchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ success: false, message: 'A Google credential is required' });

  let claims: { aud?: string; sub?: string; email?: string; email_verified?: string | boolean; name?: string; iss?: string; exp?: string };
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.data.credential)}`);
    if (!response.ok) return res.status(401).json({ success: false, message: 'Google sign-in could not be verified' });
    claims = await response.json() as typeof claims;
  } catch {
    return res.status(503).json({ success: false, message: 'Google sign-in is temporarily unavailable' });
  }

  const validIssuer = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  const validEmail = claims.email_verified === true || claims.email_verified === 'true';
  if (!claims.sub || !claims.email || claims.aud !== clientId || !validIssuer || !validEmail || Number(claims.exp) * 1000 <= Date.now()) {
    return res.status(401).json({ success: false, message: 'Google sign-in could not be verified' });
  }

  try {
    const user = await findOrCreateSocialUser('GOOGLE', claims.sub, claims.name ?? claims.email, claims.email);
    if (user.banned) return res.status(403).json({ success: false, message: 'Account is unavailable' });
    return sendSocialSession(res, user);
  } catch (error) {
    console.error('Google account sign-in failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to sign in with Google' });
  }
});

router.post('/auth/telegram', async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return res.status(503).json({ success: false, message: 'Telegram sign-in is not configured' });

  const input = telegramAuthSchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ success: false, message: 'Invalid Telegram sign-in data' });

  const { hash, ...signedFields } = input.data;
  const dataCheckString = Object.entries(signedFields)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();
  const receivedHash = Buffer.from(hash, 'hex');
  const ageSeconds = Math.floor(Date.now() / 1000) - input.data.auth_date;
  if (receivedHash.length !== expectedHash.length || !timingSafeEqual(receivedHash, expectedHash) || ageSeconds < -60 || ageSeconds > 300) {
    return res.status(401).json({ success: false, message: 'Telegram sign-in could not be verified' });
  }

  try {
    const name = [input.data.first_name, input.data.last_name].filter(Boolean).join(' ');
    const user = await findOrCreateSocialUser('TELEGRAM', input.data.id, name);
    if (user.banned) return res.status(403).json({ success: false, message: 'Account is unavailable' });
    return sendSocialSession(res, user, '');
  } catch (error) {
    console.error('Telegram account sign-in failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to sign in with Telegram' });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const payload = authSchema.pick({ email: true, password: true, name: true }).parse(req.body);
    const email = payload.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name ?? 'Reward User',
        email,
        emailNormalized: email,
        passwordHash,
        role: 'USER',
        isVerified: true,
      },
    });

    await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
        currency: 'INR',
      },
    }).catch(() => undefined);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });

    return res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Registration failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const payload = authSchema.pick({ email: true, password: true }).parse(req.body);
    const email = payload.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });

    return res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Login failed' });
  }
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return res.json({ success: true, message: 'Logged out' });
});

router.get('/users/me', authMiddleware(prisma), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, balance: true },
  });

  return res.json({ success: true, data: user });
});

router.get('/referrals', authMiddleware(prisma), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { referralCode: true } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const referrals = await prisma.referral.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, select: { id: true, code: true, status: true, createdAt: true } });
  return res.json({ success: true, data: { code: user.referralCode, referrals } });
});

router.get('/tasks', async (_req, res) => {
  const tasks = await prisma.task.findMany({
    where: { status: 'LIVE' },
    orderBy: { id: 'desc' },
  });

  return res.json({ success: true, data: tasks });
});

router.get('/tasks/:id', async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
  return res.json({ success: true, data: task });
});

router.post('/tasks/:id/verify', authMiddleware(prisma), rateLimit, async (req, res) => {
  try {
    const payload = taskVerifySchema.parse({
      taskId: req.params.id,
      verificationRef: req.body?.verificationRef,
    });

    const task = await prisma.task.findUnique({ where: { id: payload.taskId } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const existing = await prisma.userTask.findFirst({
      where: { userId: req.user!.id, taskId: payload.taskId },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Task already completed' });
    }

    return res.json({ success: true, data: { taskId: task.id, verificationRef: payload.verificationRef, status: 'verified' } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Verification failed' });
  }
});

router.post('/tasks/:id/complete', authMiddleware(prisma), rateLimit, async (req, res) => {
  try {
    const payload = taskVerifySchema.parse({
      taskId: req.params.id,
      verificationRef: req.body?.verificationRef ?? `${Date.now()}`,
    });

    const task = await prisma.task.findUnique({ where: { id: payload.taskId } });
    if (!task || task.status !== 'LIVE') {
      return res.status(404).json({ success: false, message: 'Task unavailable' });
    }

    const alreadyCompleted = await prisma.userTask.findFirst({
      where: { userId: req.user!.id, taskId: payload.taskId },
    });

    if (alreadyCompleted) {
      return res.status(409).json({ success: false, message: 'Task already completed' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const rewardAmount = task.reward;

    await prisma.$transaction(async (tx) => {
      const t = tx as any;
      await t.userTask.create({
        data: {
          userId: user.id,
          taskId: task.id,
          completedAt: new Date(),
        },
      });

      const wallet = await t.wallet.upsert({
        where: { userId: user.id },
        update: { balance: { increment: rewardAmount } },
        create: { userId: user.id, balance: rewardAmount, currency: 'INR' },
      });

      const previousBalance = (await t.wallet.findUnique({ where: { userId: user.id } }))?.balance ?? 0;
      const nextBalance = previousBalance + rewardAmount;

      await t.walletTransaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          taskId: task.id,
          type: 'TASK_REWARD',
          amount: rewardAmount,
          currency: 'INR',
          status: 'POSTED',
          balanceAfter: nextBalance,
          referenceId: payload.verificationRef,
        },
      });

      await t.user.update({
        where: { id: user.id },
        data: { balance: { increment: rewardAmount } },
      });
    });

    return res.json({ success: true, data: { taskId: task.id, reward: rewardAmount, status: 'completed' } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Task completion failed' });
  }
});

router.get('/wallet', authMiddleware(prisma), async (req, res) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
  return res.json({ success: true, data: wallet ?? { userId: req.user!.id, balance: 0, currency: 'INR' } });
});

router.get('/wallet/transactions', authMiddleware(prisma), async (req, res) => {
  const tx = await prisma.walletTransaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return res.json({ success: true, data: tx });
});

router.post('/wallet/withdraw', authMiddleware(prisma), async (req, res) => {
  const payload = z.object({
    amount: z.number().int().positive(),
    method: z.enum(['UPI', 'BANK', 'WALLET']).optional(),
    accountInfo: z.string().min(3).optional(),
  }).parse(req.body);

  const request = await prisma.$transaction(async (tx) => {
    const walletDebit = await tx.wallet.updateMany({
      where: { userId: req.user!.id, balance: { gte: payload.amount } },
      data: { balance: { decrement: payload.amount } },
    });
    const userDebit = await tx.user.updateMany({
      where: { id: req.user!.id, balance: { gte: payload.amount } },
      data: { balance: { decrement: payload.amount } },
    });
    if (walletDebit.count !== 1 || userDebit.count !== 1) {
      throw new Error('Insufficient wallet balance');
    }

    return tx.withdrawal.create({
      data: {
        userId: req.user!.id,
        amount: payload.amount,
        currency: 'INR',
        method: payload.method ?? 'UPI',
        recipient: payload.accountInfo ?? 'n/a',
        status: 'PENDING',
      },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === 'Insufficient wallet balance') {
      return null;
    }
    throw error;
  });

  if (!request) return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user!.id,
      action: 'WITHDRAWAL_REQUEST',
      entityType: 'Wallet',
      entityId: request.id,
      details: { amount: request.amount, method: request.method },
    },
  }).catch(() => undefined);

  return res.status(201).json({ success: true, data: request });
});

router.get('/admin/rewards/config', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  return res.json({ success: true, data: await readGameConfig() });
});

router.put('/admin/rewards/config', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  const parsed = gameConfigSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Invalid reward configuration' });

  const saved = await prisma.appSetting.upsert({
    where: { key: gameConfigKey },
    update: { value: parsed.data as Prisma.InputJsonValue, updatedAt: new Date() },
    create: { key: gameConfigKey, value: parsed.data as Prisma.InputJsonValue, updatedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: 'SETTINGS_UPDATE',
      entityType: 'RewardGameConfig',
      entityId: gameConfigKey,
      details: parsed.data,
    },
  }).catch(() => undefined);
  return res.json({ success: true, data: gameConfigSchema.parse(saved.value) });
});

router.get('/admin/settings', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  const settings = await prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
  return res.json({ success: true, data: settings.filter((setting) => setting.key !== gameConfigKey).map((setting) => ({
    key: setting.key,
    value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value),
    updatedAt: setting.updatedAt,
  })) });
});

router.patch('/admin/settings/:key', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });

  const payload = z.object({ value: z.string().max(2000) }).parse(req.body ?? {});
  const key = z.string().regex(/^[A-Za-z][A-Za-z0-9._-]{0,63}$/).parse(req.params.key);
  const value = payload.value;

  await prisma.appSetting.upsert({
    where: { key },
    update: { value, updatedAt: new Date() },
    create: { key, value, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: 'SETTINGS_UPDATE',
      entityType: 'System',
      entityId: String(key),
      details: { key, value },
    },
  }).catch(() => undefined);

  return res.json({ success: true, data: { key, value } });
});

router.get('/admin/payment-requests', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  const requests = await prisma.withdrawal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return res.json({ success: true, data: requests });
});

router.patch('/admin/payment-requests/:id', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });

  const payload = z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().optional(),
  }).parse(req.body ?? {});

  const request = await prisma.withdrawal.findUnique({ where: { id: String(req.params.id) } });
  if (!request) return res.status(404).json({ success: false, message: 'Payment request not found' });
  if (request.status !== 'PENDING') return res.status(409).json({ success: false, message: 'Payment request is already processed' });

  const updatedRequest = await prisma.$transaction(async (tx) => {
    if (payload.decision === 'REJECTED') {
      const wallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
      if (wallet) {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: request.amount } } });
        await tx.user.update({ where: { id: request.userId }, data: { balance: { increment: request.amount } } });
      }
    }
    return tx.withdrawal.update({ where: { id: request.id }, data: { status: payload.decision, note: payload.note } });
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: payload.decision === 'APPROVED' ? 'WITHDRAWAL_APPROVE' : 'WITHDRAWAL_REJECT',
      entityType: 'WithdrawalRequest',
      entityId: String(req.params.id),
      details: { note: payload.note, decision: payload.decision, amount: updatedRequest.amount },
    },
  }).catch(() => undefined);

  await clearRedisCache('withdrawals');

  return res.json({ success: true, data: updatedRequest });
});

router.post('/admin/cache/clear', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });

  const redisResult = await clearRedisCache('reward');
  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: 'CACHE_CLEAR',
      entityType: 'System',
      entityId: 'cache',
      details: { invalidated: redisResult.invalidated },
    },
  }).catch(() => undefined);

  return res.json({ success: true, data: { invalidated: redisResult.invalidated, message: 'Cache cleared successfully' } });
});

export default router;
