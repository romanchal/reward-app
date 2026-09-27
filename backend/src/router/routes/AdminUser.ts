/**
 * Admin routes - User management operations
 */

import { Router } from 'express';
import { prisma } from '../../db';

const router = Router();

// Admin: Get users
router.get('/users', async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isVerified: true,
        banned: true,
        createdAt: true
      }
    });
    
    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Get user by ID
router.get('/users/:id', async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isVerified: true,
        banned: true
      }
    });
    
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Admin: Verify user
router.patch('/users/:id/verify', async (req: any, res: any) => {
  try {
    const { isVerified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified }
    });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin: Manage referral
router.get('/users/:id/referrals', async (req: any, res: any) => {
  try {
    const referrals = await prisma.referral.findMany({
      where: { userId: req.params.id },
      select: {
        id: true,
        user: true,
        referredBy: true,
        code: true,
        status: true,
        createdAt: true
      }
    });
    
    res.json({ referrals, total: referrals.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

export default router;