/**
 * Custom application error with HTTP status code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Convenience factory helpers.
 */
export const BadRequest = (msg = "Bad Request") => new AppError(msg, 400);
export const Unauthorized = (msg = "Unauthorized") => new AppError(msg, 401);
export const Forbidden = (msg = "Forbidden") => new AppError(msg, 403);
export const NotFound = (msg = "Not Found") => new AppError(msg, 404);
export const Conflict = (msg = "Conflict") => new AppError(msg, 409);
export const TooManyRequests = (msg = "Too Many Requests") =>
  new AppError(msg, 429);
