import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'HTTP_ERROR') {
    super(message);
    this.name = 'HttpError';
  }
}

export function asyncHandler<T>(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<T> | T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function parseJson(value: unknown, fallback: unknown) {
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
