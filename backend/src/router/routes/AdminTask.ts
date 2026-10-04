/**
 * Admin routes - Task management operations
 */

import { Router } from 'express';
import { getTasks, getTaskById, createTask, updateTask } from '../services/Task';
import { prisma } from '../../db';

const router = Router();

router.use((req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Administrator access required' });
  next();
});

// Admin: Get all tasks (includes live and demo)
router.get('/tasks', async (req: any, res: any) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const status = String(req.query.status ?? 'ALL');
    if (!['LIVE', 'DEMO', 'ALL'].includes(status)) {
      return res.status(400).json({ error: 'Status must be LIVE, DEMO, or ALL' });
    }
    
    const tasks = await prisma.task.findMany({
      where: status === 'ALL' ? undefined : { status: status as 'LIVE' | 'DEMO' },
      orderBy: { id: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        reward: true,
        status: true,
        isDemo: true,
        
      }
    });
    
    res.json({
      tasks,
      total: tasks.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Admin: Get task by ID
router.get('/tasks/:id', async (req: any, res: any) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Admin: Create task
router.post('/tasks', async (req: any, res: any) => {
  try {
    const result = await createTask(
      req.body.title,
      req.body.description,
      Number(req.body.reward) || 0,
      req.body.status as 'LIVE' | 'DEMO',
      req.body.isDemo,
      req.body.link,
      req.body.imageUrl
    );
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as any)?.message });
  }
});

// Admin: Update task
router.put('/tasks/:id', async (req: any, res: any) => {
  try {
    const result = await updateTask(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as any)?.message });
  }
});

// Admin: Delete task
router.delete('/tasks/:id', async (req: any, res: any) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;