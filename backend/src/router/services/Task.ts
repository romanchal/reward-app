/**
 * Task service layer
 */

import { prisma } from '../../db';
import { NotFoundError } from '../utils/NotFoundError';

/**
 * Get available tasks
 */
export const getTasks = async (limit?: number, offset?: number) => {
  try {
    const limitVal = limit || 10;
    const offsetVal = offset || 0;

    const tasks = await prisma.task.findMany({
      where: {
        status: 'LIVE',
        isDemo: false
      },
      skip: offsetVal,
      take: limitVal,
      orderBy: { id: 'desc' }
    });

    return {
      tasks,
      total: tasks.length,
      limit: limitVal,
      offset: offsetVal
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2018') {
      throw new NotFoundError('No tasks available');
    }
    throw error;
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (taskId: string) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        reward: true,
        link: true,
        imageUrl: true,
        status: true,
        isDemo: true
      }
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return task;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2018') {
      throw new NotFoundError('Task not found');
    }
    throw error;
  }
};

/**
 * Create new task (Admin only)
 */
export const createTask = async (
  title: string,
  description: string,
  reward: number,
  status: 'LIVE' | 'DEMO',
  isDemo?: boolean,
  link?: string,
  imageUrl?: string
) => {
  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        reward,
        link: link || null,
        imageUrl: imageUrl || null,
        status,
        isDemo: isDemo || false
      },
      select: { id: true, title: true, description: true, reward: true, link: true, imageUrl: true }
    });

    return { success: true, data: task };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

/**
 * Update task (Admin only)
 */
export const updateTask = async (taskId: string, data: any) => {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      select: { id: true, title: true, description: true, reward: true, link: true, imageUrl: true, status: true }
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export default { getTasks, getTaskById, createTask, updateTask };