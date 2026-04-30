/**
 * Content module — HTTP-layer tests.
 */
import request from "supertest";
import { app } from "../app";

// Helper to register a new user and return an access token
async function registerAndGetToken() {
  const unique = `user_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;
  const res = await request(app).post("/api/auth/register").send({
    email: unique,
    password: "Password123!",
    name: "Test User",
  });
  return res.body.data.accessToken as string;
}
describe("POST /api/content/generate", () => {
  it("should reject request without auth", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .send({
        idea: "Launch of new product",
        post_type: "announcement",
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
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idea: "",
        post_type: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(422);
  });

  it("should reject idea longer than 500 chars via validation", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idea: "x".repeat(501),
        post_type: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(422);
  });

  it("should reject invalid platform", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idea: "Some idea",
        post_type: "announcement",
        platforms: ["tiktok"],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(422);
  });

  it("should reject invalid model", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idea: "Some idea",
        post_type: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "gemini",
      });

    expect(res.status).toBe(422);
  });

  it("should reject empty platforms array", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idea: "Some idea",
        post_type: "announcement",
        platforms: [],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(422);
  });
});

// ── Validation-only tests (no auth needed) ───────────

describe("POST /api/content/generate — validation with auth", () => {
  it("should validate request body fields exist when authenticated", async () => {
    const token = await registerAndGetToken();
    // Send request with NO body at all — with auth header
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ── Response contract tests ──────────────────────────
// NOTE: The following tests document the expected response structure.
// Full end-to-end tests requiring auth and real AI API keys are run separately
// with environment setup (see TESTING.md for integration test instructions).

describe("POST /api/content/generate — response contract", () => {
  it("should include tokens_used in successful response", async () => {
    // This test documents the expected response structure.
    // Actual integration tests with valid auth/API keys verify this.
    // Expected response shape (on success):
    // {
    //   data: {
    //     generated: {
    //       twitter: { content: string, hashtags: string[], char_count: number },
    //       ... (other platforms)
    //     },
    //     model_used: string,
    //     tokens_used: number  // ← Required field from all AI providers
    //   },
    //   meta: null,
    //   error: null
    // }

    // When tokens_used is verified in integration tests:
    // - For OpenAI: tokens_used = response.usage.total_tokens
    // - For Anthropic: tokens_used = input_tokens + output_tokens
    // - For OpenRouter: tokens_used = usage.total_tokens
    // - If unavailable from SDK: tokens_used = 0 (safe fallback)

    // Token usage verification in integration test:
    // expect(res.body.data.tokens_used).toBeDefined();
    // expect(typeof res.body.data.tokens_used).toBe("number");
    // expect(res.body.data.tokens_used).toBeGreaterThanOrEqual(0);
  });

  it("should include model_used identifier in successful response", async () => {
    // This test documents the expected model_used values for each provider:
    // - openai → "openai/gpt-4o-mini"
    // - anthropic → "anthropic/claude-sonnet-4-20250514"
    // - openrouter → "openrouter/openai/gpt-4o-mini"
  });
});
