/**
 * Authentication routes
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { registerUser as registerService, loginUser as loginService } from '../services/Auth';

const router = Router();

/**
 * Register new user endpoint
 * POST /api/auth/register
 */
router.post(
  '/register',
  body('email').trim().isLength({ min: 1 }).withMessage('Email is required'),
  body('password').trim().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await registerService(req.body.email, req.body.password, req.body.name);
      
      res.status(201).json({
        success: true,
        data: {
          userId: result.userId,
          role: result.role,
          token: result.token
        }
      });
    } catch (error) {
      const message = (error as any)?.message || 'Registration failed';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * Login endpoint
 * POST /api/auth/login
 */
router.post(
  '/login',
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await loginService(req.body.email, req.body.password);
      
      res.json({
        success: true,
        data: {
          userId: result.userId,
          role: result.role,
          token: result.token
        }
      });
    } catch (error) {
      const message = (error as any)?.message || 'Login failed';
      res.status(401).json({ error: message });
    }
  }
);

export default router;