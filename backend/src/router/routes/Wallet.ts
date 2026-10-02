/**
 * Wallet routes - User financial operations
 */

import { Router } from 'express';
import { prisma } from '../../db';

const router = Router();

// Get user wallet balance
router.get('/balance', async (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      userId: user.id,
      balance: user.balance,
      currency: 'INR',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Request withdrawal and reserve the amount until an admin decision.
router.post('/withdraw', async (req: any, res: any) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const amount = Number(req.body?.amount);
    const recipient = String(req.body?.bankAccount || req.body?.recipient || 'demo');
    
    if (amount < 1 || amount > 10000) {
      return res.status(400).json({ error: 'Amount must be between 1 and 10000' });
    }
    
    const withdrawal = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
      if (!wallet || wallet.balance < amount) throw new Error('Insufficient wallet balance');
      const nextBalance = wallet.balance - amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: nextBalance } });
      await tx.user.update({ where: { id: req.user.id }, data: { balance: nextBalance } });
      return tx.withdrawal.create({
        data: { userId: req.user.id, amount, currency: 'INR', method: 'UPI', recipient },
      });
    });

    res.status(201).json({ status: withdrawal.status, message: 'Withdrawal request submitted for admin approval', data: withdrawal });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to process withdrawal' });
  }
});

export default router;