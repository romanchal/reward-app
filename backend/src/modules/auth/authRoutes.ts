import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, HttpError } from '../../lib/http-error';
import { config } from '../../config';
import { loginUser, logoutUser, publicUser, registerUser, refreshTokens } from './authService';
import { writeAudit } from '../../lib/audit';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(100),
  role: z.enum(['USER', 'ADMIN']).optional(),
  deviceId: z.string().max(128).optional(),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1), deviceId: z.string().max(128).optional() });

function readRefreshToken(req: any): string | undefined {
  if (req.body?.refreshToken && typeof req.body.refreshToken === 'string') return req.body.refreshToken;
  const cookie = req.headers?.cookie;
  if (!cookie) return undefined;
  const match = String(cookie).split(';').map((p) => p.trim()).find((p) => p.startsWith('refresh_token='));
  return match ? decodeURIComponent(match.slice('refresh_token='.length)) : undefined;
}

const refreshCookieOpts = (nodeEnv: string) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: nodeEnv === 'production',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    if (input.role === 'ADMIN' && !config.adminRegistrationAllowed) {
      throw new HttpError(403, 'Administrator registration is disabled in this environment');
    }
    const result = await registerUser(prisma, input);
    res.cookie('refresh_token', result.refreshToken, refreshCookieOpts(config.nodeEnv));
    await writeAudit(prisma, { actorUserId: result.user.id, action: 'REGISTER', entityType: 'User', entityId: result.user.id });
    res.status(201).json({ user: result.user, accessToken: result.accessToken, tokenType: result.tokenType, expiresInSeconds: result.expiresInSeconds });
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(prisma, input);
    res.cookie('refresh_token', result.refreshToken, refreshCookieOpts(config.nodeEnv));
    await writeAudit(prisma, { actorUserId: result.user.id, action: 'LOGIN', entityType: 'User', entityId: result.user.id });
    res.json({ user: result.user, accessToken: result.accessToken, tokenType: result.tokenType, expiresInSeconds: result.expiresInSeconds });
  }));

  router.post('/demo-login', asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body ?? {});
    const result = await loginUser(prisma, input);
    res.cookie('refresh_token', result.refreshToken, refreshCookieOpts(config.nodeEnv));
    res.setHeader('X-Environment', config.paymentMode === 'demo' ? 'DEMO' : 'PRODUCTION');
    res.json({ user: result.user, accessToken: result.accessToken, tokenType: result.tokenType, expiresInSeconds: result.expiresInSeconds });
  }));

  router.post('/refresh', asyncHandler(async (req, res) => {
    const token = readRefreshToken(req);
    if (!token) throw new HttpError(401, 'refresh_token cookie or body required');
    const result = await refreshTokens(prisma, token);
    res.cookie('refresh_token', result.refreshToken, refreshCookieOpts(config.nodeEnv));
    res.json({ user: result.user, accessToken: result.accessToken, tokenType: result.tokenType, expiresInSeconds: result.expiresInSeconds });
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    await logoutUser(prisma, readRefreshToken(req));
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.status(204).end();
  }));

  router.get('/me', asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user! ) });
  }));

  router.patch('/me', asyncHandler(async (req, res) => {
    const input = z.object({ name: z.string().min(2).max(100).optional(), email: z.string().email().optional() }).parse(req.body);
    const updates: any = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email.toLowerCase();
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: updates, select: { id: true, email: true, name: true, role: true, isVerified: true, banned: true } });
    res.json({ user: publicUser(user) });
  }));

  return router;
}
