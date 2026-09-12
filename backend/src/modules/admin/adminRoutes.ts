import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../lib/http-error';
import { dashboardMetrics, disableTask, getSettings, listUsers, setUserBanned, updateSetting, upsertTask } from './adminService';
import { listAllWithdrawals, transitionWithdrawal } from '../withdrawals/withdrawalService';
import { listFraudEvents, reviewFraudEvent } from '../fraud/fraudService';

const taskSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  reward: z.number().int().positive(),
  xp: z.number().int().nonnegative().optional(),
  status: z.enum(['DRAFT', 'LIVE', 'PAUSED', 'EXPIRED', 'DEMO']).optional(),
  dailyLimit: z.number().int().positive().optional(),
  isDemo: z.boolean().optional(),
});

const settingSchema = z.object({ key: z.string().min(1).max(64), value: z.any() });
const banSchema = z.object({ banned: z.boolean() });
const withdrawalActionSchema = z.object({ reason: z.string().max(500).optional() });
const fraudReviewSchema = z.object({ decision: z.enum(['CLEAN', 'REVIEW', 'SUSPICIOUS', 'BANNED']) });

export function adminRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/dashboard', asyncHandler(async (_req, res) => res.json(await dashboardMetrics(prisma))));

  router.get('/users', asyncHandler(async (req, res) => {
    const banned = req.query.banned === 'true' ? true : req.query.banned === 'false' ? false : undefined;
    res.json(await listUsers(prisma, { banned }));
  }));
  router.post('/users/:id/ban', asyncHandler(async (req, res) => {
    const input = banSchema.parse(req.body);
    res.json(await setUserBanned(prisma, String(req.params.id), input.banned));
  }));

  router.get('/tasks', asyncHandler(async (_req, res) => {
    const items = await prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json({ items });
  }));
  router.post('/tasks', asyncHandler(async (req, res) => {
    const input = taskSchema.parse(req.body);
    res.status(201).json(await upsertTask(prisma, undefined, input));
  }));
  router.patch('/tasks/:id', asyncHandler(async (req, res) => {
    const input = taskSchema.partial({ title: true, reward: true }).parse(req.body);
    res.json(await upsertTask(prisma, String(req.params.id), input as any));
  }));
  router.post('/tasks/:id/disable', asyncHandler(async (req, res) => res.json(await disableTask(prisma, String(req.params.id)))));

  router.get('/withdrawals', asyncHandler(async (req, res) => {
    res.json(await listAllWithdrawals(prisma, req.query.status as any));
  }));
  router.post('/withdrawals/:id/approve', asyncHandler(async (req, res) => {
    const input = withdrawalActionSchema.parse(req.body ?? {});
    res.json(await transitionWithdrawal(prisma, String(req.params.id), 'APPROVED', input.reason));
  }));
  router.post('/withdrawals/:id/reject', asyncHandler(async (req, res) => {
    const input = withdrawalActionSchema.parse(req.body ?? {});
    res.json(await transitionWithdrawal(prisma, String(req.params.id), 'REJECTED', input.reason));
  }));
  router.post('/withdrawals/:id/process', asyncHandler(async (req, res) => {
    res.json(await transitionWithdrawal(prisma, String(req.params.id), 'PROCESSING'));
  }));
  router.post('/withdrawals/:id/complete', asyncHandler(async (req, res) => {
    res.json(await transitionWithdrawal(prisma, String(req.params.id), 'COMPLETED'));
  }));

  router.get('/fraud', asyncHandler(async (req, res) => res.json(await listFraudEvents(prisma, { status: req.query.status as string | undefined }))));
  router.post('/fraud/:id/review', asyncHandler(async (req, res) => {
    const input = fraudReviewSchema.parse(req.body);
    res.json(await reviewFraudEvent(prisma, String(req.params.id), input.decision));
  }));

  router.get('/settings', asyncHandler(async (_req, res) => res.json(await getSettings(prisma))));
  router.post('/settings', asyncHandler(async (req, res) => {
    const input = settingSchema.parse(req.body);
    res.json(await updateSetting(prisma, input.key, input.value));
  }));

  return router;
}
