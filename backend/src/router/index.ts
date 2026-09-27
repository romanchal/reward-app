/**
 * Router - Route definitions
 */

import { Router } from 'express';
import auth from './routes/Auth';
import task from './routes/Task';
import wallet from './routes/Wallet';
import taskAdmin from './routes/AdminTask';
import userAdmin from './routes/AdminUser';

const router = Router();

// Public API routes
router.use('/auth', auth);
router.use('/tasks', task);
router.use('/wallet', wallet);
// Refer and demo routes are not present; omit for now

// Admin routes (protected with middleware)
router.use('/admin', taskAdmin);
router.use('/user', userAdmin);

// Add routes before the others (these need the '/':1 subpath params)
router.use('/tasks/:id', task);

export default router;