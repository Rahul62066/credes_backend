import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../app";
import { env } from "../config/env";
import { redis } from "../config/redis";
import { botService } from "../modules/bot";

describe("Telegram linking token API and consumption", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("generates a linking token and stores it in Redis", async () => {
    const spySet = jest.spyOn(redis, "set").mockResolvedValue("OK");

    const access = jwt.sign({ userId: "test-user", email: "t@t.com" }, env.JWT_ACCESS_SECRET);

    const res = await request(app)
      .post("/api/user/telegram-link-token")
      .set("Authorization", `Bearer ${access}`)
      .send();

    expect(res.status).toBe(200);
    const token = res.body.data.token;
    expect(typeof token).toBe("string");
    // Redis set called with the token key and EX 600
    expect(spySet).toHaveBeenCalledWith(`telegram_link_token:{${token}}`, "test-user", "EX", 600);
  });

  it("consumeTelegramLinkToken links when token exists and deletes it", async () => {
    const fakeToken = "deadbeef";
    const chatId = 12345;
    const spyGet = jest.spyOn(redis, "get").mockResolvedValue("linked-user-1");
    const spyDel = jest.spyOn(redis, "del").mockResolvedValue(1);
    const spySet = jest.spyOn(redis, "set").mockResolvedValue("OK");

    const result = await botService.consumeTelegramLinkToken(chatId, fakeToken);
    expect(result.ok).toBe(true);
    expect(result.userId).toBe("linked-user-1");
    expect(spyGet).toHaveBeenCalledWith(`telegram_link_token:{${fakeToken}}`);
    expect(spyDel).toHaveBeenCalledWith(`telegram_link_token:{${fakeToken}}`);
    // session was saved (redis.set called for sessionKey)
    expect(spySet).toHaveBeenCalled();
  });

  it("consumeTelegramLinkToken returns invalid message when token missing", async () => {
    const fakeToken = "nope";
    jest.spyOn(redis, "get").mockResolvedValue(null);

    const result = await botService.consumeTelegramLinkToken(1, fakeToken);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Invalid or expired/);
  });
});
