/**
 * Error types and utils
 */

/**
 * Base error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string>;
  operationId?: string;

  constructor(message: string, statusCode = 400, operationId?: string) {
    super(message);
    this.name = 'AppError';
    this.message = message;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.operationId = operationId;
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  validationErrors?: { field: string; message: string }[];

  constructor(message: string = 'Validation failed', errors?: { field: string; message: string }[]) {
    super(message, 400);
    this.validationErrors = errors;
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  resource: string;

  constructor(resource: string = 'resource', message = `${resource} not found`) {
    super(message, 404);
    this.resource = resource;
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', operationId?: string) {
    super(message, 401, operationId);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', operationId?: string) {
    super(message, 409, operationId);
    this.name = 'ConflictError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends Error {
  public readonly cause?: Error;
  public readonly isTransactionError: boolean;

  constructor(message: string, cause?: Error, public readonly isTransaction = false) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;
    this.isTransactionError = Boolean(isTransaction);
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (
  error: AppError,
  req: { operationId?: string },
  res: { status: (code: number) => { json: (data: any) => any } }
): any => {
  // Development mode - verbose errors
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${error.name}: ${error.message}`);
    console.error(`Stack:`, error.stack);
  }

  // Handle validation errors
  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({
      statusCode: error.statusCode,
      operationId: error.operationId,
      title: 'Validation Error',
      detail: error.message,
      errors: error.validationErrors
    });
  }

  // Handle not found errors
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      statusCode: 404,
      operationId: req.operationId,
      title: error.name,
      detail: error.message
    });
  }

  // Handle authentication errors
  if (error instanceof UnauthorizedError) {
    return res.status(401).json({
      statusCode: 401,
      operationId: req.operationId,
      title: error.name,
      detail: error.message
    });
  }

  // Handle database errors
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      statusCode: 500,
      operationId: req.operationId,
      title: 'Database Error',
      detail: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  return res.status(500).json({
    statusCode: 500,
    operationId: req.operationId,
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
};

/**
 * HTTP status codes
 */
export const status = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  internal: 500
};