import { dashboardRepository, DashboardRepository } from "./dashboard.repository";

export class DashboardService {
  constructor(private repo: DashboardRepository = dashboardRepository) {}

  async getStats(userId: string) {
    const stats = await this.repo.getStats(userId);
    const successRate =
      stats.totalPosts === 0 ? 0 : Number(((stats.publishedPosts / stats.totalPosts) * 100).toFixed(2));

    return {
      totalPosts: stats.totalPosts,
      successRate,
      postsPerPlatform: stats.postsPerPlatform,
      failedPostsCount: stats.failedPostsCount,
      scheduledPostsCount: stats.scheduledPostsCount,
    };
  }
}

export const dashboardService = new DashboardService();
