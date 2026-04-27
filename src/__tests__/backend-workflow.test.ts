import request from "supertest";
import { app } from "../app";
import { prisma } from "../config/prisma";
import { postQueue } from "../modules/queue/queue";

const uniqueEmail = () => `user_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;

describe("Backend workflow integration", () => {
  let email = "";
  const password = "Password123!";
  let accessToken = "";
  let userId = "";
  let postId = "";

  beforeEach(async () => {
    email = uniqueEmail();
  });

  afterAll(async () => {
    await prisma.platformPost.deleteMany();
    await prisma.post.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.aiKey.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@test.com",
        },
      },
    });

  });

  it("1) register user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));

    userId = res.body.data.user.id;
    accessToken = res.body.data.accessToken;
  });

  it("2) login user", async () => {
    await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "Login User",
    });

    const res = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("3) auth middleware rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(401);
  });

  it("4) auth middleware accepts valid token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "Token User",
    });

    const token = registerRes.body.data.accessToken as string;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);
  });

  it("5) content generation validation rejects invalid input", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "Content User",
    });

    const token = registerRes.body.data.accessToken as string;

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
    expect(res.body.error.code).toBe(422);
  });

  it("6) publish endpoint creates platform jobs", async () => {
    const addSpy = jest.spyOn(postQueue, "add").mockResolvedValue({} as any);

    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "Publish User",
    });

    const token = registerRes.body.data.accessToken as string;
    const user = registerRes.body.data.user;

    await prisma.aiKey.upsert({
      where: { userId: user.id },
      update: { openaiKeyEnc: null, anthropicKeyEnc: null },
      create: { userId: user.id, openaiKeyEnc: null, anthropicKeyEnc: null },
    });

    const res = await request(app)
      .post("/api/posts/publish")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idea: "Launch feature update",
        platforms: ["twitter", "linkedin"],
        platformContents: {
          twitter: { content: "Twitter content #tag1 #tag2" },
          linkedin: { content: "LinkedIn content #tag1 #tag2 #tag3" },
          instagram: { content: "Instagram content #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10" },
          threads: { content: "Threads content #tag1 #tag2" },
        },
        language: "en",
        model: "openai",
      });

    expect(res.status).toBe(201);
    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(res.body.data.platformPosts).toHaveLength(2);
    expect(res.body.data.status).toBe("processing");

    addSpy.mockRestore();
  });

  it("7) get post status returns platform statuses", async () => {
    const addSpy = jest.spyOn(postQueue, "add").mockResolvedValue({} as any);

    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "Status User",
    });

    accessToken = registerRes.body.data.accessToken as string;
    userId = registerRes.body.data.user.id as string;

    const publishRes = await request(app)
      .post("/api/posts/publish")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        idea: "Status check idea",
        platforms: ["twitter", "linkedin"],
        platformContents: {
          twitter: { content: "twitter status content #tag1 #tag2" },
          linkedin: { content: "linkedin status content #tag1 #tag2 #tag3" },
          instagram: { content: "instagram status content #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10" },
          threads: { content: "threads status content #tag1 #tag2" },
        },
        language: "en",
        model: "openai",
      });

    expect(publishRes.status).toBe(201);
    postId = publishRes.body.data.id as string;

    const statusRes = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.id).toBe(postId);
    expect(statusRes.body.data.platformPosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ platform: "twitter", status: "queued" }),
        expect.objectContaining({ platform: "linkedin", status: "queued" }),
      ])
    );

    addSpy.mockRestore();
  });

  it("8) integration test hits PostgreSQL test DB", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "DB User",
    });

    expect(registerRes.status).toBe(201);
    const createdUserId = registerRes.body.data.user.id as string;

    const dbUser = await prisma.user.findUnique({
      where: { id: createdUserId },
      select: { id: true, email: true },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe(email);
  });
});
