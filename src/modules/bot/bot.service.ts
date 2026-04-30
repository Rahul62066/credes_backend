/**
 * Telegram bot service powered by grammY.
 * Implements Redis-backed conversational flow for post generation and publishing.
 */
import type { RequestHandler } from "express";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import type { ContentPlatform, PostType, ToneType } from "../content/content.validation";
import { contentService } from "../content/content.service";
import { postsService } from "../posts/posts.service";
import { userService } from "../user/user.service";

type BotModel = "openai" | "anthropic" | "openrouter";

type ConversationStep =
  | "idle"
  | "awaiting_post_type"
  | "awaiting_platforms"
  | "awaiting_tone"
  | "awaiting_model"
  | "awaiting_idea"
  | "preview";

interface PlatformPreview {
  content: string;
  hashtags: string[];
  characterCount: number;
}

interface TelegramSession {
  chatId: number;
  userId: string;
  step: ConversationStep;
  postType?: PostType;
  platforms: ContentPlatform[];
  tone?: ToneType;
  model?: BotModel;
  idea?: string;
  preview?: Record<string, PlatformPreview>;
  updatedAt: string;
}

const SESSION_TTL_SECONDS = 30 * 60;
const SESSION_KEY_PREFIX = "telegram_session";

const POST_TYPES: Array<{ label: string; value: PostType }> = [
  { label: "Announcement", value: "announcement" },
  { label: "Thread", value: "thread" },
  { label: "Story", value: "story" },
  { label: "Promotional", value: "promotional" },
  { label: "Educational", value: "educational" },
  { label: "Opinion", value: "opinion" },
];

const PLATFORM_OPTIONS: Array<{ label: string; value: ContentPlatform }> = [
  { label: "Twitter/X", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Instagram", value: "instagram" },
  { label: "Threads", value: "threads" },
];

const TONE_OPTIONS: Array<{ label: string; value: ToneType }> = [
  { label: "Professional", value: "professional" },
  { label: "Casual", value: "casual" },
  { label: "Witty", value: "witty" },
  { label: "Authoritative", value: "authoritative" },
  { label: "Friendly", value: "friendly" },
];

const MODEL_OPTIONS: Array<{ label: string; value: BotModel }> = [
  { label: "GPT-4o (OpenAI)", value: "openai" },
  { label: "Claude Sonnet (Anthropic)", value: "anthropic" },
  { label: "OpenRouter", value: "openrouter" },
];

function sessionKey(chatId: number): string {
  return `${SESSION_KEY_PREFIX}:{${chatId}}`;
}

export class BotService {
  private bot: Bot | null = null;
  private webhookHandler: RequestHandler | null = null;

  async initialize(): Promise<void> {
    if (this.bot) return;

    if (!env.TELEGRAM_BOT_TOKEN) {
      logger.warn("TELEGRAM_BOT_TOKEN is missing — Telegram bot is disabled");
      return;
    }

    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    this.registerHandlers();
    this.webhookHandler = webhookCallback(this.bot, "express");

    try {
      await this.bot.api.setMyCommands([
        { command: "start", description: "Link your chat and begin" },
        { command: "post", description: "Create and publish a new post" },
        { command: "status", description: "Show your last 5 posts" },
        { command: "accounts", description: "Show connected social accounts" },
        { command: "help", description: "List all commands" },
      ]);
    } catch (error) {
      logger.warn("Telegram command registration failed — continuing without it", error);
    }

    if (env.TELEGRAM_WEBHOOK_URL && env.TELEGRAM_WEBHOOK_SECRET) {
      const webhookUrl = `${env.TELEGRAM_WEBHOOK_URL.replace(/\/+$/, "")}/api/bot/telegram/webhook/${env.TELEGRAM_WEBHOOK_SECRET}`;
      try {
        await this.bot.api.setWebhook(webhookUrl);
        logger.info("Telegram webhook configured", { webhookUrl });
      } catch (error) {
        logger.warn("Telegram webhook setup failed — continuing without webhook", error);
      }
    } else {
      logger.warn(
        "Telegram webhook not configured. Set TELEGRAM_WEBHOOK_URL and TELEGRAM_WEBHOOK_SECRET."
      );
    }
  }

  getWebhookHandler(): RequestHandler {
    if (!this.webhookHandler) {
      throw new Error("Telegram bot has not been initialized");
    }
    return this.webhookHandler;
  }

  private registerHandlers(): void {
    if (!this.bot) return;

    this.bot.command("start", async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const payload = ctx.match?.toString().trim();
      const existing = await this.getSession(chatId);
      const userId = payload || existing?.userId;

      if (!userId) {
        await ctx.reply(
          "Welcome! Please link your account first using `/start <your_user_id>`.",
          {
            parse_mode: "Markdown",
          }
        );
        return;
      }

      const session = this.createEmptySession(chatId, userId);
      await this.saveSession(session);

      await ctx.reply(
        [
          "Connected successfully.",
          "",
          "Use /post to create content.",
          "Use /status to view your last 5 posts.",
          "Use /accounts to view connected social accounts.",
          "Use /help to list all commands.",
        ].join("\n")
      );
    });

    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        [
          "Available commands:",
          "/start <user_id> - Link this Telegram chat to your account",
          "/post - Start a new AI post flow",
          "/status - Show your latest 5 posts",
          "/accounts - Show connected social accounts",
          "/help - Show this help message",
        ].join("\n")
      );
    });

    this.bot.command("accounts", async (ctx) => {
      const session = await this.requireSession(ctx.chat?.id);
      if (!session) {
        await ctx.reply(this.timeoutMessage());
        return;
      }

      try {
        const accounts = await userService.listSocialAccounts(session.userId);
        if (accounts.length === 0) {
          await ctx.reply("No social accounts connected yet.");
          return;
        }

        const lines = accounts.map(
          (a) =>
            `- ${a.platform.toLowerCase()}: ${a.handle ? `@${a.handle}` : "connected"} (${a.connectedAt.toISOString().slice(0, 10)})`
        );
        await ctx.reply(["Connected accounts:", ...lines].join("\n"));
      } catch (error) {
        logger.error("Failed to fetch /accounts", error);
        await ctx.reply("Could not fetch connected accounts. Please try again.");
      }
    });

    this.bot.command("status", async (ctx) => {
      const session = await this.requireSession(ctx.chat?.id);
      if (!session) {
        await ctx.reply(this.timeoutMessage());
        return;
      }

      try {
        const result = await postsService.list(session.userId, { page: 1, limit: 5 });
        if (result.items.length === 0) {
          await ctx.reply("No posts found yet.");
          return;
        }

        const output = result.items
          .map((post, idx) => {
            const platformStatuses = post.platformPosts
              .map((p) => `${p.platform}:${p.status}`)
              .join(", ");
            return `${idx + 1}. ${post.status} | ${post.createdAt.toISOString().slice(0, 16).replace("T", " ")}\n   ${platformStatuses}`;
          })
          .join("\n");

        await ctx.reply(`Last 5 posts:\n${output}`);
      } catch (error) {
        logger.error("Failed to fetch /status", error);
        await ctx.reply("Could not fetch post status right now. Please try again.");
      }
    });

    this.bot.command("post", async (ctx) => {
      const session = await this.requireSession(ctx.chat?.id);
      if (!session) {
        await ctx.reply(this.timeoutMessage());
        return;
      }

      const nextSession: TelegramSession = {
        ...this.createEmptySession(session.chatId, session.userId),
        step: "awaiting_post_type",
      };

      await this.saveSession(nextSession);
      await ctx.reply("Choose post type:", {
        reply_markup: this.postTypeKeyboard(),
      });
    });

    this.bot.on("callback_query:data", async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const session = await this.requireSession(chatId);
      if (!session) {
        await ctx.answerCallbackQuery({ text: "Session expired" });
        await ctx.reply(this.timeoutMessage());
        return;
      }

      const data = ctx.callbackQuery.data;

      if (data.startsWith("post_type:")) {
        if (session.step !== "awaiting_post_type") {
          await ctx.answerCallbackQuery({ text: "Unexpected input. Use /post to restart." });
          return;
        }
        session.postType = data.replace("post_type:", "") as PostType;
        session.step = "awaiting_platforms";
        session.platforms = [];
        await this.saveSession(session);

        await ctx.answerCallbackQuery();
        await ctx.reply("Select one or more platforms, then tap Done.", {
          reply_markup: this.platformKeyboard(session.platforms),
        });
        return;
      }

      if (data.startsWith("platform_toggle:")) {
        if (session.step !== "awaiting_platforms") {
          await ctx.answerCallbackQuery({ text: "Unexpected input. Use /post to restart." });
          return;
        }

        const platform = data.replace("platform_toggle:", "") as ContentPlatform;
        if (session.platforms.includes(platform)) {
          session.platforms = session.platforms.filter((p) => p !== platform);
        } else {
          session.platforms.push(platform);
        }
        await this.saveSession(session);

        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({
          reply_markup: this.platformKeyboard(session.platforms),
        });
        return;
      }

      if (data === "platform_done") {
        if (session.step !== "awaiting_platforms") {
          await ctx.answerCallbackQuery({ text: "Unexpected input. Use /post to restart." });
          return;
        }
        if (session.platforms.length === 0) {
          await ctx.answerCallbackQuery({ text: "Pick at least one platform" });
          return;
        }
        session.step = "awaiting_tone";
        await this.saveSession(session);

        await ctx.answerCallbackQuery();
        await ctx.reply("Choose tone:", { reply_markup: this.toneKeyboard() });
        return;
      }

      if (data.startsWith("tone:")) {
        if (session.step !== "awaiting_tone") {
          await ctx.answerCallbackQuery({ text: "Unexpected input. Use /post to restart." });
          return;
        }
        session.tone = data.replace("tone:", "") as ToneType;
        session.step = "awaiting_model";
        await this.saveSession(session);

        await ctx.answerCallbackQuery();
        await ctx.reply("Which AI model do you want to use?", {
          reply_markup: this.modelKeyboard(),
        });
        return;
      }

      if (data.startsWith("model:")) {
        if (session.step !== "awaiting_model") {
          await ctx.answerCallbackQuery({ text: "Unexpected input. Use /post to restart." });
          return;
        }
        session.model = data.replace("model:", "") as BotModel;
        session.step = "awaiting_idea";
        await this.saveSession(session);

        await ctx.answerCallbackQuery();
        await ctx.reply("Tell me the idea or core message (max 500 characters).");
        return;
      }

      if (data === "preview_confirm") {
        if (session.step !== "preview" || !session.preview || !session.idea || !session.model) {
          await ctx.answerCallbackQuery({ text: "No preview to confirm" });
          return;
        }

        await ctx.answerCallbackQuery();
        await ctx.reply("Publishing now...");

        try {
          const preview = session.preview;
          const platformContents: Record<string, { content: string }> = {};
          const publishPlatforms = session.platforms.filter((platform) => {
            if (platform !== "instagram") {
              return true;
            }

            return Boolean(preview[platform]?.content?.trim());
          });

          const skippedInstagram = session.platforms.includes("instagram") && !publishPlatforms.includes("instagram");

          if (publishPlatforms.length === 0) {
            await ctx.reply(
              "Instagram needs an image or video URL, and this Telegram flow does not collect media yet. Please start /post again and choose a non-Instagram platform, or use the API with mediaUrl for Instagram."
            );
            return;
          }

          if (skippedInstagram) {
            await ctx.reply(
              "Instagram was skipped because this Telegram flow does not collect a media URL. Publishing the remaining platforms now."
            );
          }

          for (const platform of publishPlatforms) {
            platformContents[platform] = { content: preview[platform]?.content || "" };
          }

          const result = await postsService.publish(session.userId, {
            idea: session.idea,
            platforms: publishPlatforms,
            platformContents,
            language: "en",
            model: session.model,
          });

          const perPlatform = result.platformPosts
            .map((p) => `- ${p.platform}: ${p.status}`)
            .join("\n");
          await ctx.reply(`Queued for publishing.\nPost ID: ${result.id}\n${perPlatform}`);

          await this.saveSession(this.createEmptySession(session.chatId, session.userId));
        } catch (error) {
          logger.error("Failed to publish from Telegram", error);
          await ctx.reply("Failed to queue post for publishing. Please try again.");
        }
        return;
      }

      if (data === "preview_edit") {
        if (session.step !== "preview") {
          await ctx.answerCallbackQuery({ text: "Nothing to edit" });
          return;
        }
        session.step = "awaiting_idea";
        session.idea = undefined;
        session.preview = undefined;
        await this.saveSession(session);

        await ctx.answerCallbackQuery();
        await ctx.reply("Okay, send a new idea (max 500 characters).");
        return;
      }

      if (data === "preview_cancel") {
        await this.saveSession(this.createEmptySession(session.chatId, session.userId));
        await ctx.answerCallbackQuery();
        await ctx.reply("Cancelled. Use /post whenever you want to start again.");
        return;
      }

      await ctx.answerCallbackQuery({ text: "Unknown action" });
    });

    this.bot.on("message:text", async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const session = await this.requireSession(chatId);
      if (!session) {
        if (!ctx.message.text.startsWith("/")) {
          await ctx.reply(this.timeoutMessage());
        }
        return;
      }

      if (session.step === "awaiting_idea") {
        const idea = ctx.message.text.trim();
        if (!idea) {
          await ctx.reply("Idea cannot be empty. Please enter text up to 500 characters.");
          return;
        }
        if (idea.length > 500) {
          await ctx.reply("Idea is too long. Please keep it within 500 characters.");
          return;
        }
        if (!session.postType || !session.tone || !session.model || session.platforms.length === 0) {
          await ctx.reply("Session state is incomplete. Use /post to restart.");
          await this.saveSession(this.createEmptySession(session.chatId, session.userId));
          return;
        }

        session.idea = idea;
        await this.saveSession(session);
        await ctx.reply("Generating your content...");

        try {
          const generated = await contentService.generate(session.userId, {
            idea,
            postType: session.postType,
            platforms: session.platforms,
            tone: session.tone,
            language: "en",
            model: session.model,
          });

          const previewText = session.platforms
            .map((platform) => {
              const p = generated.platforms[platform];
              return `${this.platformLabel(platform)} (${p.characterCount} chars):\n${p.content}`;
            })
            .join("\n\n");

          session.preview = generated.platforms;
          session.step = "preview";
          await this.saveSession(session);

          await ctx.reply(`Preview:\n\n${previewText}`, {
            reply_markup: this.previewKeyboard(),
          });
        } catch (error) {
          logger.error("Content generation failed from Telegram", error);
          await ctx.reply(
            "Could not generate preview due to an API failure. Please retry with /post."
          );
          await this.saveSession(this.createEmptySession(session.chatId, session.userId));
        }
        return;
      }

      if (!ctx.message.text.startsWith("/")) {
        await ctx.reply("Unexpected input for current step. Use /post to begin the flow.");
      }
    });

    this.bot.catch((err) => {
      logger.error("Unhandled Telegram bot error", err.error);
    });
  }

  private async getSession(chatId: number): Promise<TelegramSession | null> {
    const raw = await redis.get(sessionKey(chatId));
    if (!raw) return null;

    const session = JSON.parse(raw) as TelegramSession;
    await redis.expire(sessionKey(chatId), SESSION_TTL_SECONDS);
    return session;
  }

  private async requireSession(chatId?: number): Promise<TelegramSession | null> {
    if (!chatId) return null;
    return this.getSession(chatId);
  }

  private async saveSession(session: TelegramSession): Promise<void> {
    const next = { ...session, updatedAt: new Date().toISOString() };
    await redis.set(sessionKey(session.chatId), JSON.stringify(next), "EX", SESSION_TTL_SECONDS);
  }

  private createEmptySession(chatId: number, userId: string): TelegramSession {
    return {
      chatId,
      userId,
      step: "idle",
      platforms: [],
      updatedAt: new Date().toISOString(),
    };
  }

  private postTypeKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    POST_TYPES.forEach((type) => {
      kb.text(type.label, `post_type:${type.value}`).row();
    });
    return kb;
  }

  private platformKeyboard(selected: ContentPlatform[]): InlineKeyboard {
    const kb = new InlineKeyboard();
    PLATFORM_OPTIONS.forEach((platform) => {
      const checked = selected.includes(platform.value) ? "✅ " : "";
      kb.text(`${checked}${platform.label}`, `platform_toggle:${platform.value}`).row();
    });
    kb.text("Done", "platform_done");
    return kb;
  }

  private toneKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    TONE_OPTIONS.forEach((tone) => {
      kb.text(tone.label, `tone:${tone.value}`).row();
    });
    return kb;
  }

  private modelKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    MODEL_OPTIONS.forEach((model) => {
      kb.text(model.label, `model:${model.value}`).row();
    });
    return kb;
  }

  private previewKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text("Yes, Post Now", "preview_confirm")
      .row()
      .text("Edit Idea", "preview_edit")
      .text("Cancel", "preview_cancel");
  }

  private platformLabel(platform: ContentPlatform): string {
    const hit = PLATFORM_OPTIONS.find((p) => p.value === platform);
    return hit?.label || platform;
  }

  private timeoutMessage(): string {
    return "Session timed out after 30 minutes of inactivity. Use /start <your_user_id> to reconnect.";
  }
}

export const botService = new BotService();
