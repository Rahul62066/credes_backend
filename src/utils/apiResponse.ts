/**
 * Standardised API response helpers.
 *
 * Response envelope: { data, meta, error }
 */
import { Response } from "express";

interface SuccessPayload<T> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

interface ErrorPayload {
  statusCode?: number;
  message?: string;
  details?: unknown;
}

export class ApiResponse {
  /**
   * Send a success response.
   *
   * { data: T | null, meta: { message, ...extra } | null, error: null }
   */
  static success<T>(res: Response, payload: SuccessPayload<T> = {}): void {
    const { statusCode = 200, message, data, meta } = payload;

    const metaBlock: Record<string, unknown> | null =
      message || meta ? { ...(message && { message }), ...meta } : null;

    res.status(statusCode).json({
      data: data ?? null,
      meta: metaBlock,
      error: null,
    });
  }

  /**
   * Send an error response.
   *
   * { data: null, meta: null, error: { code, message, details? } }
   */
  static error(res: Response, payload: ErrorPayload = {}): void {
    const {
      statusCode = 500,
      message = "Internal Server Error",
      details,
    } = payload;

    const errorBlock: Record<string, unknown> = {
      code: statusCode,
      message,
    };

    if (details) {
      errorBlock.details = details;
    }

    res.status(statusCode).json({
      data: null,
      meta: null,
      error: errorBlock,
    });
  }
}
