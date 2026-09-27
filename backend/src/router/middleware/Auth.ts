/**
 * Middleware - Authentication
 */

import { UnauthorizedError } from '../utils/Error';
import { prisma } from '../../db';

/**
 * Verify JWT token and get user
 */
export const verifyToken = async (token: string): Promise<{ userId: string } | null> => {
  try {
    // Verify token
    const secret = process.env.JWT_SECRET || 'your-secret';
    const payload = await authenticate(token, secret);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });
    
    if (!user) {
      return null;
    }
    
    if (user.banned) {
      throw new UnauthorizedError('Account is suspended');
    }
    
    return { userId: payload.userId };
  } catch (error) {
    if (error instanceof Error) {
      throw new UnauthorizedError(error.message || 'Invalid token');
    }
    throw error;
  }
};

import * as jwt from 'jsonwebtoken';

/**
 * Authenticate JWT token
 */
export const authenticate = async (
  token: string,
  secret: string,
  options?: { maxAge?: string }
): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, {
      maxAge: options?.maxAge || '15m',
      complete: true,
    }, async (err, decoded) => {
      if (err) {
        if ((err as { name: string }).name === 'TokenExpiredError') {
          resolve(null);
        } else {
          reject(err);
        }
        return;
      }
      resolve((decoded as any)?.payload ?? null);
    });
  });
};

/**
 * Require authentication middleware
 */
export const requireAuth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next(new UnauthorizedError('No authorization token provided'));
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
  
  // Attach user to request
  req.user = { userId: user.userId };
  
  next();
};

export default { verifyToken, requireAuth };