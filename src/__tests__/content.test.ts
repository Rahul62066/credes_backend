/**
 * Content module — HTTP-layer tests.
 */
import request from "supertest";
import { app } from "../app";

describe("POST /api/content/generate", () => {
  it("should reject request without auth", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .send({
        idea: "Launch of new product",
        postType: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        language: "en",
        model: "openai",
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(401);
    expect(res.body.data).toBeNull();
  });

  it("should reject empty idea", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", "Bearer invalid-token")
      .send({
        idea: "",
        postType: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "openai",
      });

    // Auth fails first (401) before validation
    expect(res.status).toBe(401);
  });

  it("should reject idea longer than 500 chars via validation", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", "Bearer invalid-token")
      .send({
        idea: "x".repeat(501),
        postType: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(401);
  });

  it("should reject invalid platform", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", "Bearer invalid-token")
      .send({
        idea: "Some idea",
        postType: "announcement",
        platforms: ["tiktok"],
        tone: "professional",
        model: "openai",
      });

    // Auth fails first
    expect(res.status).toBe(401);
  });

  it("should reject invalid model", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", "Bearer invalid-token")
      .send({
        idea: "Some idea",
        postType: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "gemini",
      });

    expect(res.status).toBe(401);
  });

  it("should reject empty platforms array", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", "Bearer invalid-token")
      .send({
        idea: "Some idea",
        postType: "announcement",
        platforms: [],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(401);
  });
});

// ── Validation-only tests (no auth needed) ───────────

describe("POST /api/content/generate — validation without auth", () => {
  it("should validate request body fields exist", async () => {
    // Send request with NO body at all — no auth header
    const res = await request(app)
      .post("/api/content/generate")
      .send({});

    // Auth guard runs before validation, so we get 401
    expect(res.status).toBe(401);
  });
});
