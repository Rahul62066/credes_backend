/**
 * Queue module — BullMQ queue definitions.
 *
 * Centralised queue creation. Each feature adds its own queue here
 * and its corresponding worker in src/workers/.
 */
import { Queue } from "bullmq";
import { env } from "../../config/env";

import { getRedisConfig } from "../../config/redis";

const connectionOpts = getRedisConfig();

/**
 * Post-publishing queue — processes scheduled posts.
 */
export const postQueue = new Queue("post-publish", {
  connection: connectionOpts,
  prefix: env.BULL_QUEUE_PREFIX,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
    attempts: 3,
    backoff: { type: "publish-platform-backoff" },
  },
});

/**
 * Bot actions queue — processes bot automation tasks.
 */
export const botQueue = new Queue("bot-actions", {
  connection: connectionOpts,
  prefix: env.BULL_QUEUE_PREFIX,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

console.log("📮 BullMQ queues initialised");
