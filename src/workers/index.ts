/**
 * BullMQ Workers.
 *
 * Each worker listens to a queue and processes jobs.
 * Import and start workers from server.ts.
 */
import { Worker, Job } from "bullmq";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const connectionOpts = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};

/**
 * Post-publish worker — processes scheduled post publishing jobs.
 */
export const postWorker = new Worker(
  "post-publish",
  async (job: Job) => {
    logger.info(`Processing post-publish job ${job.id}`, job.data);
    // TODO: Implement actual post publishing logic
  },
  {
    connection: connectionOpts,
    prefix: env.BULL_QUEUE_PREFIX,
    concurrency: 5,
  }
);

postWorker.on("completed", (job) => {
  logger.info(`✅ Post-publish job ${job.id} completed`);
});

postWorker.on("failed", (job, err) => {
  logger.error(`❌ Post-publish job ${job?.id} failed`, err.message);
});

/**
 * Bot actions worker — processes bot automation jobs.
 */
export const botWorker = new Worker(
  "bot-actions",
  async (job: Job) => {
    logger.info(`Processing bot-actions job ${job.id}`, job.data);
    // TODO: Implement actual bot action logic
  },
  {
    connection: connectionOpts,
    prefix: env.BULL_QUEUE_PREFIX,
    concurrency: 3,
  }
);

botWorker.on("completed", (job) => {
  logger.info(`✅ Bot-actions job ${job.id} completed`);
});

botWorker.on("failed", (job, err) => {
  logger.error(`❌ Bot-actions job ${job?.id} failed`, err.message);
});

logger.info("👷 BullMQ workers started");
