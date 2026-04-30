import Redis from "ioredis";
import { env } from "./env";

/**
 * Parse Redis connection URL or use host/port
 * Handles both formats:
 * - redis://[:password@]host:port
 * - Separate REDIS_HOST and REDIS_PORT env vars
 */
export function getRedisConfig(): { host?: string; port?: number; password?: string; url?: string; tls?: boolean } {
  // Prefer a full REDIS_URL (supports redis:// and rediss://)
  if (env.REDIS_URL) {
    try {
      const url = new URL(env.REDIS_URL);
      const isTls = url.protocol === "rediss:" || url.protocol === "rediss";
      return {
        url: env.REDIS_URL,
        password: url.password || undefined,
        tls: isTls,
      };
    } catch (err) {
      console.warn("Failed to parse REDIS_URL, falling back to host/port", err);
    }
  }

  const host = env.REDIS_HOST;
  // Check if REDIS_HOST is a full URL (starts with redis://)
  if (host && host.startsWith("redis://")) {
    try {
      const url = new URL(host);
      return {
        url: host,
        password: url.password || undefined,
        tls: url.protocol === "rediss:",
      };
    } catch (err) {
      console.warn("Failed to parse REDIS_HOST as URL, falling back to host:port format", err);
    }
  }

  // Use separate host/port configuration
  return {
    host,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  };
}

const redisConfig = getRedisConfig();
/**
 * Shared Redis connection instance.
 * Used by BullMQ workers and application-level caching.
 */
export const redis = new Redis(
  redisConfig.url
    ? redisConfig.url
    : {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        tls: redisConfig.tls ? {} : undefined,
      },
  {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  }
);

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

/**
 * Returns a new Redis connection (for BullMQ workers that need their own connection).
 */
export function createRedisConnection(): Redis {
  if (redisConfig.url) {
    return new Redis(redisConfig.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    tls: redisConfig.tls ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
