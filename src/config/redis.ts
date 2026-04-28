import Redis from "ioredis";
import { env } from "./env";

/**
 * Parse Redis connection URL or use host/port
 * Handles both formats:
 * - redis://[:password@]host:port
 * - Separate REDIS_HOST and REDIS_PORT env vars
 */
export function getRedisConfig(): { host: string; port: number; password?: string } {
  const host = env.REDIS_HOST;

  // Check if REDIS_HOST is a full URL (starts with redis://)
  if (host.startsWith("redis://")) {
    try {
      const url = new URL(host);
      return {
        host: url.hostname,
        port: parseInt(url.port || "6379", 10),
        password: url.password || undefined,
      };
    } catch (err) {
      console.warn("Failed to parse Redis URL, falling back to host:port format", err);
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
export const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});

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
  return new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
