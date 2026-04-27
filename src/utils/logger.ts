/**
 * Simple structured logger.
 * Replace with winston/pino in production if needed.
 */
import { env } from "../config/env";

type LogLevel = "info" | "warn" | "error" | "debug";

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(formatMessage("info", message, meta));
  },

  warn(message: string, meta?: unknown): void {
    console.warn(formatMessage("warn", message, meta));
  },

  error(message: string, meta?: unknown): void {
    console.error(formatMessage("error", message, meta));
  },

  debug(message: string, meta?: unknown): void {
    if (env.isDev) {
      console.debug(formatMessage("debug", message, meta));
    }
  },
};
