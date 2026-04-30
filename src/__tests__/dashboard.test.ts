import { DashboardService } from "../modules/dashboard/dashboard.service";

describe("DashboardService.getStats", () => {
  it("computes successRate from publishedPosts and totalPosts", async () => {
    const repo = {
      getStats: jest.fn().mockResolvedValue({
        totalPosts: 8,
        publishedPosts: 6,
        failedPostsCount: 1,
        scheduledPostsCount: 1,
        postsPerPlatform: {
          twitter: 4,
          linkedin: 2,
          instagram: 1,
          threads: 1,
          facebook: 0,
        },
      }),
    };

    const service = new DashboardService(repo as never);
    const result = await service.getStats("user-123");

    expect(repo.getStats).toHaveBeenCalledWith("user-123");
    expect(result).toMatchObject({
      totalPosts: 8,
      successRate: 75,
      postsPerPlatform: {
        twitter: 4,
        linkedin: 2,
        instagram: 1,
        threads: 1,
        facebook: 0,
      },
      failedPostsCount: 1,
      scheduledPostsCount: 1,
    });
  });

  it("returns 0 successRate when there are no posts", async () => {
    const repo = {
      getStats: jest.fn().mockResolvedValue({
        totalPosts: 0,
        publishedPosts: 0,
        failedPostsCount: 0,
        scheduledPostsCount: 0,
        postsPerPlatform: {
          twitter: 0,
          linkedin: 0,
          instagram: 0,
          threads: 0,
          facebook: 0,
        },
      }),
    };

    const service = new DashboardService(repo as never);
    const result = await service.getStats("user-123");

    expect(result.successRate).toBe(0);
  });
});
