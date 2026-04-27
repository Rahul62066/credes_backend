import Redis from "ioredis";
import { env } from "./env";

/**
 * Shared Redis connection instance.
 * Used by BullMQ workers and application-level caching.
 */
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
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
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
