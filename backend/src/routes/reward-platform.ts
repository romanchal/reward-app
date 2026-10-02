import { Router } from 'express';
import { z } from 'zod';
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

const taskVerifySchema = z.object({
  taskId: z.string().min(1),
  verificationRef: z.string().min(1),
});

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

  const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
  if (!wallet || wallet.balance < payload.amount) {
    return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
  }

  const request = {
    id: makeId('withdrawal'),
    userId: req.user!.id,
    amount: payload.amount,
    method: payload.method ?? 'UPI',
    accountInfo: payload.accountInfo ?? 'n/a',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user!.id,
      action: 'WITHDRAWAL_REQUEST',
      entityType: 'Wallet',
      entityId: request.id,
      details: { amount: request.amount, method: request.method },
    },
  }).catch(() => undefined);

  return res.json({ success: true, data: request });
});

router.get('/admin/settings', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  return res.json({ success: true, data: [] });
});

router.patch('/admin/settings/:key', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });

  const key = req.params.key;
  const value = String(req.body?.value ?? '');

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      action: 'GLOBAL_SETTING_UPDATE',
      entityType: 'System',
      entityId: String(key),
      details: { key, value },
    },
  }).catch(() => undefined);

  return res.json({ success: true, data: { key, value } });
});

router.get('/admin/payment-requests', authMiddleware(prisma), async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
  const requests = await prisma.withdrawal.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
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
        const balance = wallet.balance + request.amount;
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance } });
        await tx.user.update({ where: { id: request.userId }, data: { balance } });
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
