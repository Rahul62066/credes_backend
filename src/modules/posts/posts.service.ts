/**
 * Posts module — Service layer.
 */
import {
  Platform,
  PostStatus,
  PlatformPostStatus,
  PostType,
  Tone,
} from "../../../generated/prisma";
import { NotFound, BadRequest } from "../../utils/appError";
import { postQueue } from "../queue/queue";
import { postsRepository, PostsRepository } from "./posts.repository";
import type {
  PublishPostInput,
  SchedulePostInput,
  ListPostsQueryInput,
} from "./posts.validation";

interface PlatformJobData {
  platform: "twitter" | "linkedin" | "instagram" | "threads";
  userId: string;
  postId: string;
  platformPostId: string;
}

const STATUS_FILTER_MAP: Record<string, PostStatus> = {
  draft: PostStatus.DRAFT,
  scheduled: PostStatus.SCHEDULED,
  processing: PostStatus.PROCESSING,
  published: PostStatus.PUBLISHED,
  partially_published: PostStatus.PARTIALLY_PUBLISHED,
  failed: PostStatus.FAILED,
  cancelled: PostStatus.CANCELLED,
};

const PLATFORM_MAP: Record<string, Platform> = {
  twitter: Platform.TWITTER,
  linkedin: Platform.LINKEDIN,
  instagram: Platform.INSTAGRAM,
  threads: Platform.THREADS,
};

const POST_TYPE_MAP: Record<string, PostType> = {
  announcement: PostType.ANNOUNCEMENT,
  thread: PostType.THREAD,
  story: PostType.STORY,
  promotional: PostType.PROMOTIONAL,
  educational: PostType.EDUCATIONAL,
  opinion: PostType.OPINION,
};

const TONE_MAP: Record<string, Tone> = {
  professional: Tone.PROFESSIONAL,
  casual: Tone.CASUAL,
  witty: Tone.WITTY,
  authoritative: Tone.AUTHORITATIVE,
  friendly: Tone.FRIENDLY,
};

function toApiPlatform(platform: Platform): "twitter" | "linkedin" | "instagram" | "threads" {
  const value = platform.toLowerCase();
  if (value === "twitter" || value === "linkedin" || value === "instagram" || value === "threads") {
    return value;
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function toApiPlatformStatus(
  status: PlatformPostStatus
): "queued" | "processing" | "published" | "failed" | "cancelled" {
  if (status === PlatformPostStatus.PENDING) return "queued";
  if (status === PlatformPostStatus.PUBLISHING) return "processing";
  if (status === PlatformPostStatus.PUBLISHED) return "published";
  if (status === PlatformPostStatus.FAILED) return "failed";
  return "cancelled";
}

function toApiPostType(postType: PostType): string {
  return postType.toLowerCase();
}

function toApiTone(tone: Tone): string {
  return tone.toLowerCase();
}

function mapPostForApi(post: {
  id: string;
  idea: string;
  postType: PostType;
  tone: Tone;
  status: PostStatus;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  language: string;
  modelUsed: string | null;
  platformPosts: Array<{
    id: string;
    platform: Platform;
    status: PlatformPostStatus;
    content: string;
    errorMessage: string | null;
    attempts: number;
    publishedAt: Date | null;
  }>;
}) {
  return {
    id: post.id,
    idea: post.idea,
    post_type: toApiPostType(post.postType),
    tone: toApiTone(post.tone),
    status: post.status.toLowerCase(),
    publishAt: post.publishAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    language: post.language,
    model: post.modelUsed,
    platformPosts: post.platformPosts.map((p) => ({
      id: p.id,
      platform: toApiPlatform(p.platform),
      status: toApiPlatformStatus(p.status),
      content: p.content,
      errorMessage: p.errorMessage,
      attempts: p.attempts,
      publishedAt: p.publishedAt,
    })),
  };
}

export class PostsService {
  constructor(private repo: PostsRepository = postsRepository) {}

  async publish(userId: string, input: PublishPostInput) {
    const post = await this.repo.createPostWithPlatformPosts({
      userId,
      idea: input.idea,
      postType: POST_TYPE_MAP[input.post_type],
      tone: TONE_MAP[input.tone],
      language: input.language,
      modelUsed: input.model,
      status: PostStatus.PROCESSING,
      platformContents: input.platforms.map((platform) => ({
        platform: PLATFORM_MAP[platform],
        content: input.platformContents[platform]?.content || "",
        mediaUrl: input.platformContents[platform]?.mediaUrl,
        status: PlatformPostStatus.PENDING,
      })),
    });

    await this.enqueuePerPlatform(post.id, userId, post.platformPosts, 0);

    return mapPostForApi(post);
  }

  async schedule(userId: string, input: SchedulePostInput) {
    const publishAt = new Date(input.publishAt);
    if (publishAt.getTime() <= Date.now()) {
      throw BadRequest("publishAt must be a future datetime");
    }

    const post = await this.repo.createPostWithPlatformPosts({
      userId,
      idea: input.idea,
      postType: POST_TYPE_MAP[input.post_type],
      tone: TONE_MAP[input.tone],
      language: input.language,
      modelUsed: input.model,
      publishAt,
      status: PostStatus.SCHEDULED,
      platformContents: input.platforms.map((platform) => ({
        platform: PLATFORM_MAP[platform],
        content: input.platformContents[platform]?.content || "",
        mediaUrl: input.platformContents[platform]?.mediaUrl,
        status: PlatformPostStatus.PENDING,
      })),
    });

    const delayMs = Math.max(0, publishAt.getTime() - Date.now());
    await this.enqueuePerPlatform(post.id, userId, post.platformPosts, delayMs);

    return mapPostForApi(post);
  }

  async list(userId: string, query: ListPostsQueryInput) {
    if (query.fromDate && query.toDate) {
      const from = new Date(query.fromDate);
      const to = new Date(query.toDate);
      if (from > to) {
        throw BadRequest("fromDate cannot be later than toDate");
      }
    }

    const { items, total } = await this.repo.listPosts({
      userId,
      page: query.page,
      limit: query.limit,
      status: query.status ? STATUS_FILTER_MAP[query.status] : undefined,
      platform: query.platform ? PLATFORM_MAP[query.platform] : undefined,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });

    return {
      items: items.map(mapPostForApi),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(userId: string, postId: string) {
    const post = await this.repo.getPostById(userId, postId);
    if (!post) {
      throw NotFound("Post not found");
    }
    return mapPostForApi(post);
  }

  async retry(userId: string, postId: string) {
    const post = await this.repo.getPostById(userId, postId);
    if (!post) {
      throw NotFound("Post not found");
    }

    const failedPlatformPosts = post.platformPosts.filter((p) => p.status === PlatformPostStatus.FAILED);
    if (failedPlatformPosts.length === 0) {
      throw BadRequest("No failed platform posts to retry");
    }

    for (const platformPost of failedPlatformPosts) {
      await this.repo.updatePlatformPostStatus({
        platformPostId: platformPost.id,
        status: PlatformPostStatus.PENDING,
        errorMessage: null,
      });
    }

    await this.repo.updatePostStatus(postId, PostStatus.PROCESSING);
    await this.enqueuePerPlatform(post.id, userId, failedPlatformPosts, 0);

    const updated = await this.repo.getPostById(userId, postId);
    if (!updated) {
      throw NotFound("Post not found after retry");
    }
    return mapPostForApi(updated);
  }

  async cancel(userId: string, postId: string) {
    const post = await this.repo.cancelPostAndQueuedPlatformPosts(userId, postId);
    if (!post) {
      throw NotFound("Post not found");
    }
    return { id: postId, status: "cancelled" };
  }

  private async enqueuePerPlatform(
    postId: string,
    userId: string,
    platformPosts: Array<{ id: string; platform: Platform }>,
    delayMs: number
  ) {
    await Promise.all(
      platformPosts.map((platformPost) => {
        const data: PlatformJobData = {
          platform: toApiPlatform(platformPost.platform),
          userId,
          postId,
          platformPostId: platformPost.id,
        };

        return postQueue.add("publish-platform-post", data, {
          jobId: `${postId}__${platformPost.id}`,
          attempts: 3,
          delay: delayMs,
          backoff: {
            type: "publish-platform-backoff",
          },
        });
      })
    );
  }
}

export const postsService = new PostsService();
