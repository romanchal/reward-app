/**
 * Admin routes - User management operations
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db';

const router = Router();

router.use((req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Administrator access required' });
  next();
});

router.post('/password', async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ error: 'New password must be 8 or more characters and no more than 72 bytes' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different from the current password' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

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

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Admin: Verify user
router.patch('/users/:id/verify', async (req: any, res: any) => {
  try {
    const { isVerified } = req.body;
    if (typeof isVerified !== 'boolean') return res.status(400).json({ error: 'isVerified must be a boolean' });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified },
      select: { id: true, email: true, name: true, role: true, isVerified: true },
    });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.patch('/users/:id/ban', async (req: any, res: any) => {
  try {
    const banned = Boolean(req.body?.banned);
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'ADMIN') return res.status(400).json({ error: 'Administrator accounts cannot be suspended here' });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { banned },
      select: { id: true, email: true, name: true, role: true, banned: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.id ?? null,
        action: banned ? 'USER_SUSPEND' : 'USER_RESTORE',
        entityType: 'User',
        entityId: user.id,
        details: { email: user.email },
      },
    }).catch(() => undefined);

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account access' });
  }
});

router.get('/audit', async (req: any, res: any) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ logs, total: logs.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load audit activity' });
  }
});

// Admin: Manage referral
router.get('/users/:id/referrals', async (req: any, res: any) => {
  try {
    const referrals = await prisma.referral.findMany({
      where: { userId: req.params.id },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true } },
        referredBy: { select: { id: true, name: true, email: true } },
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