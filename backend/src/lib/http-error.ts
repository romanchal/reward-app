/**
 * Custom API Error Handler
 */
/**
 * Custom API Error Handler
 */

import { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  status: number;
  operationId?: string;
  errors?: Record<string, string>;
  validationErrors?: { field: string; message: string }[];

  // Accept either (message, status) or (status, message) for backward compatibility
  constructor(statusOrMessage: number | string, messageOrStatus?: string | number, operationId?: string) {
    let message: string;
    let status: number;
    if (typeof statusOrMessage === 'number') {
      status = statusOrMessage;
      message = typeof messageOrStatus === 'string' ? messageOrStatus : 'Error';
    } else {
      message = statusOrMessage;
      status = typeof messageOrStatus === 'number' ? messageOrStatus : 500;
    }
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.operationId = operationId;
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Validation Error', public validationErrors: { field: string; message: string }[] = []) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export const asyncHandler = <T extends Request, U extends Response>(fn: (req: Request, res: Response, next: NextFunction) => any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    return res.status(err.status || 500).json({ error: err.message });
  }
  console.error(err);
  return res.status(err?.status || 500).json({ error: err?.message || 'Internal Server Error' });
};

export default {
  HttpError,
  ValidationError,
  asyncHandler,
  errorHandler,
};