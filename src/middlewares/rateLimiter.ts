import { Request, Response, NextFunction } from "express";
import { redis } from "../config";
import { ApiResponse } from "../utils/apiResponse";
import { rateLimitConfig } from "../config/env";

interface RateLimitOptions {
  prefix: string; // key prefix
  windowSeconds: number;
  max: number;
  byUser?: boolean; // if true, rate limit is per-user when authenticated
}

function getIdentifier(req: Request, byUser: boolean): string {
  if (byUser && req.user && (req.user as any).userId) {
    return `user:${(req.user as any).userId}`;
  }
  // fallback to IP for unauthenticated
  return `ip:${req.ip}`;
}

export function rateLimiter(options: RateLimitOptions) {
  const windowSeconds = options.windowSeconds;
  const max = options.max;
  const prefix = options.prefix;
  const byUser = options.byUser ?? true;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getIdentifier(req, byUser);
      const key = `${prefix}:${id}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > max) {
        ApiResponse.error(res, {
          statusCode: 429,
          message: "Rate limit exceeded",
        });
        return;
      }

      next();
    } catch (err) {
      // Fail-open: if Redis is unreachable, allow the request
      next();
    }
  };
}

// Convenience exported instances for common rules
export const contentRateLimiter = rateLimiter({
  prefix: "rl:content",
  windowSeconds: rateLimitConfig.content.windowSeconds,
  max: rateLimitConfig.content.max,
  byUser: true,
});

export const publishRateLimiter = rateLimiter({
  prefix: "rl:publish",
  windowSeconds: rateLimitConfig.publish.windowSeconds,
  max: rateLimitConfig.publish.max,
  byUser: true,
});

export default rateLimiter;
