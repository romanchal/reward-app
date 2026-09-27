import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import config from '../../config';
import { loginUser, logoutUser, publicUser, registerUser, refreshTokens } from './authService';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(100),
  role: z.enum(['USER', 'ADMIN']).optional(),
  deviceId: z.string().max(128).optional(),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1), deviceId: z.string().max(128).optional() });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    if (input.role === 'ADMIN' && !config.adminRegistrationAllowed) {
      throw new Error('Administrator registration is disabled in this environment');
    }
    const result = await registerUser(prisma, input);
    res.cookie('refresh_token', result.refreshToken, { httpOnly: true, sameSite: 'lax', secure: config.app.nodeEnv === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.status(201).json(result);
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(prisma, input);
    res.cookie('refresh_token', result.refreshToken, { httpOnly: true, sameSite: 'lax', secure: config.app.nodeEnv === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json(result);
  }));

  router.post('/demo-login', asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body ?? {});
    const result = await loginUser(prisma, input);
    res.setHeader('X-Environment', (process.env.PAYMENT_MODE === 'demo') ? 'DEMO' : 'PRODUCTION');
    res.json(result);
  }));

  router.post('/refresh', asyncHandler(async (req, res) => {
    const input = refreshSchema.parse(req.body);
    res.json(await refreshTokens(prisma, input.refreshToken));
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    await logoutUser(prisma, req.body?.refreshToken);
    res.clearCookie('refresh_token');
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
