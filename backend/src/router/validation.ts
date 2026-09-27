/**
 * Express validation module
 */

export const body = (field: string, options?: { [key: string]: any }) => {
  // Simplified implementation - in production use express-validator or express-mongo-sanitize
  return (req: any, _: any, next: any) => {
    next();
  };
};

// Re-export for convenience

import { validationResult } from 'express-validator';

export { validationResult } from 'express-validator';