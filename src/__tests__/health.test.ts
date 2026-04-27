/**
 * Health check endpoint tests.
 */
import request from "supertest";
import { app } from "../app";

describe("GET /health", () => {
  it("should return 200 with health status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Postly API is healthy 🚀",
      data: {
        status: "ok",
      },
    });
    expect(res.body.data.uptime).toBeDefined();
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.environment).toBeDefined();
  });
});

describe("GET /unknown-route", () => {
  it("should return 404 for unknown routes", async () => {
    const res = await request(app).get("/this-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      message: "Route not found",
    });
  });
});
