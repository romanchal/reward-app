import type { NextFunction, Request, Response } from 'express';

// Minimal validation error middleware placeholder. The codebase uses
// several validation styles; keep this middleware simple and non-invasive.
export function validateErrors(req: Request, _res: Response, next: NextFunction) {
  // No-op: route handlers perform their own validation and error handling.
  return next();
}

export default validateErrors;