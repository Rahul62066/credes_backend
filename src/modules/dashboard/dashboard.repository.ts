import { prisma } from "../../config/prisma";
import { Platform, PlatformPostStatus, PostStatus } from "../../../generated/prisma";

const ALL_PLATFORMS: Platform[] = [
  Platform.TWITTER,
  Platform.LINKEDIN,
  Platform.INSTAGRAM,
  Platform.THREADS,
  Platform.FACEBOOK,
];

export class DashboardRepository {
  async getStats(userId: string) {
    const [totalPosts, publishedPosts, failedPostsCount, scheduledPostsCount] =
      await prisma.$transaction([
        prisma.post.count({
          where: { userId },
        }),
        prisma.post.count({
          where: {
            userId,
            status: {
              in: [PostStatus.PUBLISHED, PostStatus.PARTIALLY_PUBLISHED],
            },
          },
        }),
        prisma.post.count({
          where: {
            userId,
            status: PostStatus.FAILED,
          },
        }),
        prisma.post.count({
          where: {
            userId,
            status: PostStatus.SCHEDULED,
          },
        }),
      ]);

    const platformGroups = await prisma.platformPost.groupBy({
      by: ["platform"],
      orderBy: {
        platform: "asc",
      },
      where: {
        post: { userId },
        status: {
          not: PlatformPostStatus.SKIPPED,
        },
      },
      _count: {
        id: true,
      },
    });

    const postsPerPlatform: Record<string, number> = {};
    for (const platform of ALL_PLATFORMS) {
      postsPerPlatform[platform.toLowerCase()] = 0;
    }
    for (const group of platformGroups) {
      const count =
        group._count && typeof group._count === "object" && "id" in group._count
          ? Number(group._count.id ?? 0)
          : 0;
      postsPerPlatform[group.platform.toLowerCase()] = count;
    }

    return {
      totalPosts,
      publishedPosts,
      failedPostsCount,
      scheduledPostsCount,
      postsPerPlatform,
    };
  }
}

export const dashboardRepository = new DashboardRepository();
