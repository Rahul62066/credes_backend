/**
 * Posts module — Repository layer.
 */
import { prisma } from "../../config/prisma";
import {
  Platform,
  PostStatus,
  PlatformPostStatus,
  PostType,
  Tone,
  type Prisma,
} from "../../../generated/prisma";

export class PostsRepository {
  async createPostWithPlatformPosts(data: {
    userId: string;
    idea: string;
    postType: PostType;
    tone: Tone;
    language: string;
    modelUsed?: string;
    publishAt?: Date;
    status: PostStatus;
    platformContents: Array<{ platform: Platform; content: string; mediaUrl?: string; status: PlatformPostStatus }>;
  }): Promise<Prisma.PostGetPayload<{ include: { platformPosts: true } }>> {
    return prisma.post.create({
      data: {
        userId: data.userId,
        idea: data.idea,
        language: data.language,
        modelUsed: data.modelUsed,
        publishAt: data.publishAt,
        postType: data.postType,
        tone: data.tone,
        status: data.status,
        platformPosts: {
          create: data.platformContents,
        },
      },
      include: {
        platformPosts: true,
      },
    });
  }

  async listPosts(params: {
    userId: string;
    page: number;
    limit: number;
    status?: PostStatus;
    platform?: Platform;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const where: Prisma.PostWhereInput = {
      userId: params.userId,
      ...(params.status && { status: params.status }),
      ...((params.fromDate || params.toDate) && {
        createdAt: {
          ...(params.fromDate && { gte: params.fromDate }),
          ...(params.toDate && { lte: params.toDate }),
        },
      }),
      ...(params.platform && {
        platformPosts: {
          some: {
            platform: params.platform,
          },
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          platformPosts: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.post.count({ where }),
    ]);

    return { items, total };
  }

  async getPostById(userId: string, postId: string) {
    return prisma.post.findFirst({
      where: { id: postId, userId },
      include: {
        platformPosts: true,
      },
    });
  }

  async getPostByIdForWorker(postId: string) {
    return prisma.post.findUnique({
      where: { id: postId },
      include: {
        platformPosts: true,
      },
    });
  }

  async getPlatformPost(platformPostId: string) {
    return prisma.platformPost.findUnique({
      where: { id: platformPostId },
      select: {
        id: true,
        postId: true,
        platform: true,
        content: true,
        mediaUrl: true,
        status: true,
        publishedAt: true,
        errorMessage: true,
        attempts: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getUserSocialAccount(userId: string, platform: Platform) {
    return prisma.socialAccount.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });
  }

  async updatePlatformPostStatus(params: {
    platformPostId: string;
    status: PlatformPostStatus;
    attempts?: number;
    errorMessage?: string | null;
    publishedAt?: Date | null;
  }) {
    return prisma.platformPost.update({
      where: { id: params.platformPostId },
      data: {
        status: params.status,
        ...(params.attempts !== undefined && { attempts: params.attempts }),
        ...(params.errorMessage !== undefined && { errorMessage: params.errorMessage }),
        ...(params.publishedAt !== undefined && { publishedAt: params.publishedAt }),
      },
    });
  }

  async updatePostStatus(postId: string, status: PostStatus) {
    return prisma.post.update({
      where: { id: postId },
      data: { status },
    });
  }

  async recomputePostStatus(postId: string): Promise<PostStatus> {
    const platformPosts = await prisma.platformPost.findMany({
      where: { postId },
      select: { status: true },
    });

    const statuses = platformPosts.map((p) => p.status);

    let next: PostStatus = PostStatus.PROCESSING;

    if (statuses.length > 0 && statuses.every((s) => s === PlatformPostStatus.PUBLISHED)) {
      next = PostStatus.PUBLISHED;
    } else if (statuses.some((s) => s === PlatformPostStatus.PUBLISHED)) {
      next = PostStatus.PARTIALLY_PUBLISHED;
    } else if (statuses.every((s) => s === PlatformPostStatus.FAILED)) {
      next = PostStatus.FAILED;
    } else if (statuses.every((s) => s === PlatformPostStatus.SKIPPED)) {
      next = PostStatus.CANCELLED;
    }

    await prisma.post.update({ where: { id: postId }, data: { status: next } });
    return next;
  }

  async cancelPostAndQueuedPlatformPosts(userId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
      include: { platformPosts: true },
    });

    if (!post) return null;

    await prisma.$transaction([
      prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.CANCELLED },
      }),
      prisma.platformPost.updateMany({
        where: {
          postId,
          status: { in: [PlatformPostStatus.PENDING, PlatformPostStatus.PUBLISHING] },
        },
        data: {
          status: PlatformPostStatus.SKIPPED,
          errorMessage: "Cancelled by user",
        },
      }),
    ]);

    return post;
  }

  async getFailedPlatformPosts(postId: string) {
    return prisma.platformPost.findMany({
      where: {
        postId,
        status: PlatformPostStatus.FAILED,
      },
    });
  }
}

export const postsRepository = new PostsRepository();
