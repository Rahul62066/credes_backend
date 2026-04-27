/**
 * Standardised API response helpers.
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
  errors?: unknown;
}

export class ApiResponse {
  /**
   * Send a success response.
   */
  static success<T>(res: Response, payload: SuccessPayload<T> = {}): void {
    const { statusCode = 200, message = "Success", data, meta } = payload;

    const body: Record<string, unknown> = {
      success: true,
      message,
      data: data ?? null,
    };

    if (meta) {
      body.meta = meta;
    }

    res.status(statusCode).json(body);
  }

  /**
   * Send an error response.
   */
  static error(res: Response, payload: ErrorPayload = {}): void {
    const {
      statusCode = 500,
      message = "Internal Server Error",
      errors,
    } = payload;

    const body: Record<string, unknown> = {
      success: false,
      message,
    };

    if (errors) {
      body.errors = errors;
    }

    res.status(statusCode).json(body);
  }
}
