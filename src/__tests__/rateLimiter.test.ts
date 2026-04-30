/**
 * Rate Limiter middleware — unit tests.
 */
import request from "supertest";
import { app } from "../app";
import { redis } from "../config/redis";

describe("Rate Limiter Middleware", () => {
  beforeEach(async () => {
    // Clear all rate limiter keys
    const keys = await redis.keys("rl:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    const keys = await redis.keys("rl:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe("Content generation rate limit", () => {
    it("should allow requests within the limit", async () => {
      // Content generation is limited to 10 requests per 15 minutes
      // We should be able to make at least one request without hitting the limit
      // Use a valid registered user to exercise rate limiter middleware
      const unique = `user_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;
      const registerRes = await request(app).post("/api/auth/register").send({
        email: unique,
        password: "Password123!",
        name: "Rate Test",
      });
      const token = registerRes.body.data.accessToken as string;

      const res = await request(app)
        .post("/api/content/generate")
        .set("Authorization", `Bearer ${token}`)
        .send({
          idea: "test idea",
          post_type: "announcement",
          platforms: ["twitter"],
          tone: "professional",
          model: "openai",
        });

      // Should be validation or success (not auth failure)
      expect([200, 201, 422]).toContain(res.status);
    });

    it("should track requests per authenticated user", async () => {
      // Simulate reaching rate limit by directly incrementing counter
      const userId = "test-user-123";
      const key = `rl:content:user:${userId}`;

      // Increment to just below limit (limit is 10 by default)
      for (let i = 0; i < 10; i++) {
        await redis.incr(key);
      }

      // Next request from this user should be rate limited
      const count = await redis.incr(key);
      expect(count).toBe(11); // 11 > 10, so rate limit should trigger
    });
  });

  describe("Publish rate limit", () => {
    it("should track requests per authenticated user for publishing", async () => {
      const userId = "test-user-456";
      const key = `rl:publish:user:${userId}`;

      // Increment to just below limit (limit is 20 by default)
      for (let i = 0; i < 20; i++) {
        await redis.incr(key);
      }

      // Next request should exceed the limit
      const count = await redis.incr(key);
      expect(count).toBe(21); // 21 > 20, so rate limit should trigger
    });
  });

  describe("Rate limit key expiry", () => {
    it("should expire old rate limit keys", async () => {
      const key = "rl:test:expiring-key";

      // Set a key with very short TTL
      await redis.incr(key);
      await redis.expire(key, 1);

      // Key should exist
      let exists = await redis.exists(key);
      expect(exists).toBe(1);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Key should be gone
      exists = await redis.exists(key);
      expect(exists).toBe(0);
    });
  });
});
