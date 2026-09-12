import crypto from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti: string;
}

export function signAccessToken(user: { id: string; role: UserRole }, secret: string) {
  const opts: SignOptions = {
    subject: user.id,
    expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as SignOptions['expiresIn'],
    jwtid: crypto.randomBytes(12).toString('hex'),
  };
  return jwt.sign({ type: 'access' }, secret, opts);
}

export function signRefreshToken(user: { id: string; role: UserRole }, secret: string) {
  const opts: SignOptions = {
    subject: user.id,
    expiresIn: (process.env.REFRESH_TOKEN_TTL ?? '30d') as SignOptions['expiresIn'],
    jwtid: crypto.randomBytes(12).toString('hex'),
  };
  return jwt.sign({ type: 'refresh' }, secret, opts);
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
