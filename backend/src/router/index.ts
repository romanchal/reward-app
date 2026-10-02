/**
 * Router - Route definitions
 */

import { Router } from 'express';
import auth from './routes/Auth';
import task from './routes/Task';
import wallet from './routes/Wallet';
import taskAdmin from './routes/AdminTask';
import userAdmin from './routes/AdminUser';
import rewardPlatform from '../routes/reward-platform';

const router = Router();

// Public API routes
router.use('/auth', auth);
router.use('/tasks', task);
router.use('/wallet', wallet);
router.use('/', rewardPlatform);

// Admin routes (protected with middleware)
router.use('/admin', taskAdmin);
router.use('/user', userAdmin);

// Route alias for platform API
router.use('/platform', rewardPlatform);

// Add routes before the others (these need the '/':1 subpath params)
router.use('/tasks/:id', task);

export default router;