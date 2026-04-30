/**
 * OAuth HTTP-layer tests.
 */
import request from "supertest";
import { app } from "../app";
import { redis } from "../config/redis";

describe("OAuth connect routes", () => {
  it("requires auth for Twitter connect", async () => {
    const res = await request(app).get("/api/oauth/twitter/connect");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(401);
  });
});

describe("OAuth callback validation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects Twitter callback when code is missing", async () => {
    const res = await request(app).get("/api/oauth/twitter/callback?state=test-state");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Missing OAuth code or state");
  });

  it("rejects Twitter callback when state is invalid", async () => {
    jest.spyOn(redis, "get").mockResolvedValue(null as never);

    const res = await request(app)
      .get("/api/oauth/twitter/callback?code=test-code&state=invalid-state");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Invalid or expired OAuth state");
  });
});