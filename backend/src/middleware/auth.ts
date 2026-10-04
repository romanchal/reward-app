import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth';
import { HttpError } from '../lib/http-error';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
      requestId?: string;
      idempotencyKey?: string;
    }
  }
}

function getCookieValue(raw: string | undefined, name: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.split(';').find((entry) => entry.trim().startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.trim().slice(name.length + 1));
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  const cookieToken = getCookieValue(req.headers.cookie, 'access_token') ?? getCookieValue(req.headers.cookie, 'jwt');
  return cookieToken;
}

export function authMiddleware(prisma: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const original = req.originalUrl || req.path || '/';
    const isPublic =
      original === '/' ||
      original === '/api' ||
      original === '/api/' ||
      original.startsWith('/api/auth') ||
      (req.method === 'GET' && original.split('?')[0] === '/api/promos/yono-rummy') ||
      (req.method === 'GET' && original.split('?')[0] === '/api/rewards/config') ||
      original === '/api/docs' ||
      original.startsWith('/api/docs?') ||
      original.startsWith('/api/health');

    if (isPublic) return next();

    const token = extractToken(req);
    if (!token) throw new HttpError(401, 'Authentication required');

    const payload = verifyToken(token, process.env.JWT_SECRET ?? 'local-change-me', 'access');
    if (!payload) throw new HttpError(401, 'Invalid or expired access token');

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, banned: true },
    });

    if (!user || user.banned) throw new HttpError(403, 'Account is unavailable');
    req.user = { id: user.id, role: user.role };
    next();
  };
}

export function adminMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') throw new HttpError(403, 'Administrator access required');
  next();
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.get('Idempotency-Key') || req.idempotencyKey;
  if (!key) return next();

  const cacheKey = `${req.method}:${req.baseUrl}${req.path}:${key}`;
  const seen = req.app.locals.idempotency.get(cacheKey);
  if (seen) return seen;

  req.app.locals.idempotency.set(cacheKey, res);
  next();
}

export function auditMiddleware(prisma: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const action = req.body?.auditAction as string | undefined;
    if (!action) return next();

    const entityId = typeof req.params?.id === 'string' ? req.params.id : 'request';
    await prisma.auditLog
      .create({
        data: {
          actorUserId: req.user?.id ?? null,
          action: action as any,
          entityType: req.route?.path?.split('/').filter(Boolean).pop() ?? 'request',
          entityId,
          details: req.body,
        },
      })
      .catch(() => undefined);

    next();
  };
}
