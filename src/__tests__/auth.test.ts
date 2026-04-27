/**
 * Auth module — Validation & HTTP-layer tests.
 *
 * These tests verify request validation and response shape
 * WITHOUT requiring a database connection.
 */
import request from "supertest";
import { app } from "../app";

describe("POST /api/auth/register — validation", () => {
  it("should reject missing email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "Password123!" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(422);
    expect(res.body.error.message).toBe("Validation failed");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
      ])
    );
    expect(res.body.data).toBeNull();
  });

  it("should reject invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "Password123!" });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
      ])
    );
  });

  it("should reject password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@test.com", password: "short" });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "password" }),
      ])
    );
  });

  it("should reject password longer than 72 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@test.com", password: "a".repeat(73) });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "password" }),
      ])
    );
  });
});

describe("POST /api/auth/login — validation", () => {
  it("should reject missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it("should reject invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad", password: "password" });

    expect(res.status).toBe(422);
  });
});

describe("POST /api/auth/refresh — validation", () => {
  it("should reject missing refreshToken", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "refreshToken" }),
      ])
    );
  });
});

describe("POST /api/auth/logout — validation", () => {
  it("should reject missing refreshToken", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "refreshToken" }),
      ])
    );
  });
});

describe("GET /api/auth/me — auth guard", () => {
  it("should reject request without Authorization header", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(401);
    expect(res.body.data).toBeNull();
  });

  it("should reject request with malformed Bearer token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "NotBearer xyz");

    expect(res.status).toBe(401);
  });

  it("should reject request with invalid JWT", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token");

    expect(res.status).toBe(401);
  });
});
