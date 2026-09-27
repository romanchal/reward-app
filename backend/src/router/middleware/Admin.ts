/**
 * Middleware - Admin authorization
 */

import { ConflictError } from '../utils/Error';
import { prisma } from '../../db';

/**
 * Verify admin role middleware
 */
export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user) {
      return next(new ConflictError('Not authenticated: Admin access required'));
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    
    if (user?.role !== 'ADMIN') {
      return next(new ConflictError('Unauthorized: Admin access required'));
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    next(error);
  }
};

/**
 * Audit log middleware
 */
export const auditLog = async (req: any, res: any, next: any) => {
  if (process.env.ENABLE_AUDIT_LOG === 'true' || process.env.NODE_ENV === 'development') {
    const action = req.method;
    const path = req.path;
    const userId = req.user?.userId;
    
    // In production, save to audit table
    console.log(`[AUDIT] ${action} ${path} - userId: ${userId}`);
  }
  
  next();
};

export default { requireAdmin, auditLog };