/**
 * Health check endpoint tests.
 */
import request from "supertest";
import { app } from "../app";

describe("GET /health", () => {
  it("should return 200 with health status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toMatchObject({ status: "ok" });
    expect(res.body.data.uptime).toBeDefined();
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.environment).toBeDefined();
    expect(res.body.meta).toMatchObject({
      message: "Postly API is healthy 🚀",
    });
  });
});

describe("GET /unknown-route", () => {
  it("should return 404 for unknown routes", async () => {
    const res = await request(app).get("/this-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toMatchObject({
      code: 404,
      message: "Route not found",
    });
  });
});
