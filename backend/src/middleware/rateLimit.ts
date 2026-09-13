import type { NextFunction, Request, Response } from 'express';

interface Bucket { count: number; reset: number }

function makeLimiter(namespace: string, max: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${namespace}:${clientId}`;
    const now = Date.now();
    const bucket = buckets.get(key) ?? { count: 0, reset: now + windowMs };
    if (now >= bucket.reset) { bucket.count = 0; bucket.reset = now + windowMs; }
    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.reset - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

export const rateLimit = makeLimiter('global', 100, 60_000);
export const authRateLimit = makeLimiter('auth', 10, 60_000);
export const withdrawalRateLimit = makeLimiter('withdrawal', 5, 60_000);
