export class ValidationError extends Error {
  public statusCode = 400;
  constructor(message = 'Validation error') {
    super(message);
    this.name = 'ValidationError';
  }
}

export default ValidationError;
