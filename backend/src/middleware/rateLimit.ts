import type { NextFunction, Request, Response } from 'express';

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, reset: now + 60_000 };

  if (now >= bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + 60_000;
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  res.setHeader('RateLimit-Limit', '100');
  res.setHeader('RateLimit-Remaining', String(Math.max(0, 100 - bucket.count)));

  if (bucket.count > 100) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
}
