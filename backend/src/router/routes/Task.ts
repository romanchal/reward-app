/**
 * Task routes layer
 */

import { Router } from 'express';
import { getTasks, getTaskById, updateTask } from '../services/Task';
import { prisma } from '../../db';

const router = Router();

router.post('/:id/complete', async (req: any, res: any) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id: req.params.id } });
      if (!task || task.status !== 'LIVE') {
        return { error: 'Task is not available', status: 404 };
      }

      const existing = await tx.userTask.findUnique({
        where: { userId_taskId: { userId: req.user.id, taskId: task.id } },
      });
      if (existing) return { error: 'Task already completed', status: 409 };

      const wallet = await tx.wallet.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, balance: 0 },
        update: {},
      });
      const balanceAfter = wallet.balance + task.reward;

      await tx.userTask.create({ data: { userId: req.user.id, taskId: task.id } });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      await tx.user.update({ where: { id: req.user.id }, data: { balance: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          userId: req.user.id,
          walletId: wallet.id,
          taskId: task.id,
          type: 'TASK_REWARD',
          amount: task.reward,
          currency: wallet.currency,
          balanceAfter,
          referenceId: `task:${task.id}`,
        },
      });

      return { balance: balanceAfter, reward: task.reward };
    });

    if ('error' in result) return res.status(result.status).json({ error: result.error });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(500).json({ error: 'Failed to complete task' });
  }
});

/**
 * Get all tasks
 * GET /api/tasks
 */
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    
    const result = await getTasks(limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * Get task by ID
 * GET /api/tasks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(404).json({ error: (error as any)?.message });
  }
});

/**
 * Update task (Admin only)
 * PUT /api/tasks/:id
 */
router.put('/:id', async (req, res) => {
  try {
    // In production, add admin verification here
    const result = await updateTask(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ error: (error as any)?.message });
  }
});

export default router;