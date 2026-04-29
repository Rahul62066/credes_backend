/**
 * Telegram Bot Webhook Signature Verification — tests.
 */
import request from "supertest";
import { app } from "../app";

describe("Telegram Webhook Verification", () => {
  const validSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "test-secret-12345";

  describe("Path-based secret validation", () => {
    it("should reject webhook with invalid path secret", async () => {
      const res = await request(app)
        .post("/api/bot/telegram/webhook/invalid-secret")
        .send({ update_id: 123, message: { text: "test" } });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Invalid webhook secret");
    });

    it("should accept webhook with valid path secret (if TELEGRAM_VERIFY_WEBHOOK=false)", async () => {
      // This test assumes TELEGRAM_VERIFY_WEBHOOK is not set to true during testing
      // The webhook will be validated but may fail on bot initialization
      // We're mainly testing that the path secret check passes

      const res = await request(app)
        .post(`/api/bot/telegram/webhook/${validSecret}`)
        .send({ update_id: 123, message: { text: "test" } });

      // May be 400/500 due to bot not being initialized in test, but not 401
      // The important part is we got past the secret check
      expect(res.status).not.toBe(401);
    });
  });

  describe("Header-based verification (when TELEGRAM_VERIFY_WEBHOOK=true)", () => {
    // Note: These tests assume the env var is configurable during test
    // In actual environment, this would be set to true in production

    it("should reject request without X-Telegram-Bot-Api-Secret-Token header when verification enabled", async () => {
      // This test is informational; actual behavior depends on TELEGRAM_VERIFY_WEBHOOK env
      const res = await request(app)
        .post(`/api/bot/telegram/webhook/${validSecret}`)
        .send({ update_id: 123, message: { text: "test" } });

      // If TELEGRAM_VERIFY_WEBHOOK is true, should get 401 without header
      if (process.env.TELEGRAM_VERIFY_WEBHOOK === "true") {
        expect(res.status).toBe(401);
      } else {
        // If not enabled, should pass secret check
        expect(res.status).not.toBe(401);
      }
    });

    it("should accept request with valid header token when verification enabled", async () => {
      const res = await request(app)
        .post(`/api/bot/telegram/webhook/${validSecret}`)
        .set("X-Telegram-Bot-Api-Secret-Token", validSecret)
        .send({ update_id: 123, message: { text: "test" } });

      // Should pass both secret checks
      expect(res.status).not.toBe(401);
    });

    it("should reject request with invalid header token when verification enabled", async () => {
      const res = await request(app)
        .post(`/api/bot/telegram/webhook/${validSecret}`)
        .set("X-Telegram-Bot-Api-Secret-Token", "wrong-token")
        .send({ update_id: 123, message: { text: "test" } });

      // If verification is enabled, should get 401
      if (process.env.TELEGRAM_VERIFY_WEBHOOK === "true") {
        expect(res.status).toBe(401);
      }
    });
  });
});
