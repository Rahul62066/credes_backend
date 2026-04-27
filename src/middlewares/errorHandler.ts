/**
 * Global error-handling middleware.
 * Must be registered LAST in the middleware chain.
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { ApiResponse } from "../utils/apiResponse";
import { env } from "../config/env";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational errors we threw intentionally
  if (err instanceof AppError) {
    ApiResponse.error(res, {
      statusCode: err.statusCode,
      message: err.message,
    });
    return;
  }

  // Unexpected / programmer errors
  console.error("🔥 Unhandled Error:", err);

  ApiResponse.error(res, {
    statusCode: 500,
    message: env.isProd ? "Internal Server Error" : err.message,
  });
}
