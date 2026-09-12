import type { NextFunction, Request, Response } from 'express';

export function adminMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') throw new Error('Administrator access required');
  next();
}
