/**
 * BullMQ Workers.
 *
 * Each worker listens to a queue and processes jobs.
 * Import and start workers from server.ts.
 */
import { Worker, Job } from "bullmq";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { Platform, PlatformPostStatus, PostStatus, Prisma } from "../../generated/prisma";
import { postsRepository } from "../modules/posts/posts.repository";
import { platformPublisherService } from "../modules/posts/platformPublisher.service";

import { getRedisConfig } from "../config/redis";

const connectionOpts = getRedisConfig();

/**
 * Post-publish worker — processes scheduled post publishing jobs.
 */
export const postWorker = new Worker(
  "post-publish",
  async (job: Job<{ platform: string; userId: string; postId: string; platformPostId: string }>) => {
    logger.info(`Processing post-publish job ${job.id}`, job.data);

    const { postId, platformPostId, userId, platform } = job.data;

    // Skip processing when user cancelled before worker picked up the job.
    const post = await postsRepository.getPostByIdForWorker(postId);
    if (!post) {
      throw new Error("Post not found");
    }
    if (post.status === PostStatus.CANCELLED) {
      await postsRepository.updatePlatformPostStatus({
        platformPostId,
        status: PlatformPostStatus.SKIPPED,
        errorMessage: "Cancelled by user",
      });
      await postsRepository.recomputePostStatus(postId);
      return;
    }

    await postsRepository.updatePlatformPostStatus({
      platformPostId,
      status: PlatformPostStatus.PUBLISHING,
      attempts: job.attemptsMade + 1,
      errorMessage: null,
    });
    await postsRepository.updatePostStatus(postId, PostStatus.PROCESSING);

    // Simulated publish integration point per platform.
    // Replace with real platform APIs and OAuth tokens.
    const platformPost = await postsRepository.getPlatformPost(platformPostId);
    if (!platformPost) {
      throw new Error("Platform post not found");
    }

    const platformEnum = thisPlatform(platform);
    const socialAccount = await postsRepository.getUserSocialAccount(userId, platformEnum);
    if (!socialAccount) {
      throw new Error(
        `No connected ${platform} account found for user. Connect the account and retry.`
      );
    }

    const publishResult = await platformPublisherService.publish(platformEnum, {
      userId,
      postId,
      platformPostId,
      content: platformPost.content,
      mediaUrl: platformPost.mediaUrl || undefined,
      socialAccount: {
        accessTokenEnc: socialAccount.accessTokenEnc,
        refreshTokenEnc: socialAccount.refreshTokenEnc,
        handle: socialAccount.handle,
      },
    });

    await postsRepository.updatePlatformPostStatus({
      platformPostId,
      status: PlatformPostStatus.PUBLISHED,
      attempts: job.attemptsMade + 1,
      publishedAt: new Date(),
      errorMessage: null,
      providerPostId: publishResult.providerPostId ?? null,
      providerRawResponse: publishResult.providerRaw === null ? Prisma.DbNull : publishResult.providerRaw,
    });

    await postsRepository.recomputePostStatus(postId);
  },
  {
    connection: connectionOpts,
    prefix: env.BULL_QUEUE_PREFIX,
    concurrency: 5,
    settings: {
      backoffStrategy(attemptsMade: number, _type?: string) {
        const schedule = [1000, 5000, 25000];
        return schedule[Math.max(0, Math.min(attemptsMade - 1, schedule.length - 1))];
      },
    },
  }
);

postWorker.on("completed", (job) => {
  logger.info(`✅ Post-publish job ${job.id} completed`);
});

postWorker.on("failed", (job, err) => {
  logger.error(`❌ Post-publish job ${job?.id} failed`, err.message);

  if (!job?.data?.platformPostId || !job?.data?.postId) {
    return;
  }

  const finalFailure = (job.attemptsMade ?? 0) >= (job.opts.attempts ?? 1);
  if (!finalFailure) {
    return;
  }

  void (async () => {
    await postsRepository.updatePlatformPostStatus({
      platformPostId: job.data.platformPostId,
      status: PlatformPostStatus.FAILED,
      attempts: job.attemptsMade,
      errorMessage: err.message,
    });
    await postsRepository.recomputePostStatus(job.data.postId);
  })();
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

function thisPlatform(platform: string): Platform {
  const value = platform.toLowerCase();
  if (value === "twitter") return Platform.TWITTER;
  if (value === "linkedin") return Platform.LINKEDIN;
  if (value === "instagram") return Platform.INSTAGRAM;
  if (value === "threads") return Platform.THREADS;
  throw new Error(`Unsupported platform in job: ${platform}`);
}
