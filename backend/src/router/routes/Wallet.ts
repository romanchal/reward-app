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

// Request withdrawal (Demo mode)
router.post('/withdraw', async (req: any, res: any) => {
  try {
    const { amount, bankAccount, bankName, bankNumber } = req.body;
    
    if (amount < 1 || amount > 10000) {
      return res.status(400).json({ error: 'Amount must be between 1 and 10000' });
    }
    
    // In production, verify admin role and redirect to admin panel
    res.json({
      status: 'REQUESTED',
      message: 'Withdrawal request submitted for admin approval'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

export default router;