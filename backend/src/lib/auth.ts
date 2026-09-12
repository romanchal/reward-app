import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti: string;
}

export function signAccessToken(user: { id: string; role: UserRole }, secret: string) {
  return jwt.sign({ type: 'access' } as TokenPayload, secret, {
    subject: user.id,
    expiresIn: process.env.ACCESS_TOKEN_TTL ?? '15m',
    jwtid: crypto.randomBytes(12).toString('hex'),
  });
}

export function signRefreshToken(user: { id: string; role: UserRole }, secret: string) {
  return jwt.sign({ type: 'refresh' } as TokenPayload, secret, {
    subject: user.id,
    expiresIn: process.env.REFRESH_TOKEN_TTL ?? '30d',
    jwtid: crypto.randomBytes(12).toString('hex'),
  });
}

export function verifyToken(token: string, secret: string, expectedType?: 'access' | 'refresh'): TokenPayload | null {
  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    if (expectedType && payload.type !== expectedType) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
