import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { config } from './config';
import { HttpError } from './lib/http-error';
import { rateLimit, authRateLimit, withdrawalRateLimit } from './middleware/rateLimit';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import { authRoutes } from './modules/auth/authRoutes';
import { walletRoutes } from './modules/wallet/walletRoutes';
import { taskRoutes } from './modules/tasks/taskRoutes';
import { missionRoutes } from './modules/missions/missionRoutes';
import { dailyRewardsRoutes } from './modules/dailyRewards/dailyRewardsRoutes';
import { referralRoutes } from './modules/referrals/referralRoutes';
import { rewardRoutes } from './modules/rewards/rewardRoutes';
import { withdrawalRoutes } from './modules/withdrawals/withdrawalRoutes';
import { offerRoutes } from './modules/offers/offerRoutes';
import { leaderboardRoutes } from './modules/leaderboard/leaderboardRoutes';
import { adminRoutes } from './modules/admin/adminRoutes';

const PROTECTED_AUTH_PATHS = new Set(['/me']);

export function createApp(prisma: PrismaClient) {
  const app = express();
  app.locals.idempotency = new Map<string, unknown>();

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", config.frontendOrigin, config.adminOrigin],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
    xPoweredBy: false,
  }));

  const allowedOrigins = new Set([config.frontendOrigin, config.adminOrigin]);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'Idempotency-Key'],
    maxAge: 600,
  }));
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '256kb' }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId = req.get('X-Request-Id') || randomUUID();
    next();
  });

  app.use(rateLimit);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: config.nodeEnv, mode: config.paymentMode });
  });

  const guard = authMiddleware(prisma);

  const auth = authRoutes(prisma);
  app.use('/api/auth', authRateLimit, (req, res, next) => {
    if (PROTECTED_AUTH_PATHS.has(req.path)) return guard(req, res, next);
    next();
  }, auth);

  app.use('/api/wallet', guard, walletRoutes(prisma));
  app.use('/api/tasks', guard, taskRoutes(prisma));
  app.use('/api/missions', guard, missionRoutes(prisma));
  app.use('/api/daily-rewards', guard, dailyRewardsRoutes(prisma));
  app.use('/api/referrals', guard, referralRoutes(prisma));
  app.use('/api/rewards', guard, rewardRoutes(prisma));
  app.use('/api/withdrawals', guard, withdrawalRateLimit, withdrawalRoutes(prisma));
  app.use('/api/offers', guard, offerRoutes(prisma));
  app.use('/api/leaderboard', guard, leaderboardRoutes(prisma));

  app.use('/api/admin', guard, adminMiddleware, adminRoutes(prisma));

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors, requestId: req.requestId });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, code: err.code, requestId: req.requestId });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[reward-app] error', { requestId: req.requestId, message, err });
    res.status(500).json({ error: message, requestId: req.requestId });
  });

  return app;
}
