/**
 * Task routes layer
 */

import { Router } from 'express';
import { getTasks, getTaskById, updateTask } from '../services/Task';

const router = Router();

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