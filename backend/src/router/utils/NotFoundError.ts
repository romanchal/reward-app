export class NotFoundError extends Error {
  public statusCode = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export default NotFoundError;
