/**
 * WhatsApp module — Service layer using Twilio API.
 * Implements Redis-backed conversational flow for post generation via WhatsApp.
 */
import { Twilio } from "twilio";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { contentService } from "../content/content.service";
import { postsService } from "../posts/posts.service";
import { userService } from "../user/user.service";
import type {
  WhatsAppSession,
  PostType,
  ContentPlatform,
  ToneType,
  BotModel,
  TwilioIncomingMessage,
} from "./whatsapp.validation";

const SESSION_TTL_SECONDS = 30 * 60;
const SESSION_KEY_PREFIX = "whatsapp_session";

const POST_TYPES: Array<{ label: string; value: PostType }> = [
  { label: "1. Announcement", value: "announcement" },
  { label: "2. Thread", value: "thread" },
  { label: "3. Story", value: "story" },
  { label: "4. Promotional", value: "promotional" },
  { label: "5. Educational", value: "educational" },
  { label: "6. Opinion", value: "opinion" },
];

const PLATFORMS: ContentPlatform[] = ["twitter", "linkedin", "instagram", "threads"];

const TONES: ToneType[] = ["professional", "casual", "witty", "authoritative", "friendly"];

const MODELS: BotModel[] = ["openai", "anthropic", "openrouter"];

function sessionKey(phoneNumber: string): string {
  return `${SESSION_KEY_PREFIX}:{${phoneNumber}}`;
}

export class WhatsAppService {
  private twilioClient: Twilio | null = null;
  private fromNumber: string = "";

  initialize(): void {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
      logger.warn("Twilio credentials are missing — WhatsApp bot is disabled");
      return;
    }

    this.twilioClient = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    this.fromNumber = env.TWILIO_WHATSAPP_FROM;
    logger.info("WhatsApp bot initialized with Twilio");
  }

  async handleIncomingMessage(payload: TwilioIncomingMessage): Promise<void> {
    if (!this.twilioClient) {
      logger.warn("WhatsApp bot not initialized");
      return;
    }

    const phoneNumber = payload.WaId;
    const messageBody = (payload.Body || "").trim();

    try {
      let session = await this.getSession(phoneNumber);

      // Handle /start command
      if (messageBody.startsWith("/start")) {
        const userId = messageBody.replace("/start", "").trim();
        if (!userId) {
          await this.sendMessage(
            phoneNumber,
            "Please use: /start <your_user_id> to link your account."
          );
          return;
        }

        session = this.createEmptySession(phoneNumber);
        session.userId = userId;
        session.step = "awaiting_post_type";
        await this.saveSession(session);

        await this.sendMessage(
          phoneNumber,
          "✅ Connected! Now choose a post type:\n" + POST_TYPES.map((t) => t.label).join("\n")
        );
        return;
      }

      if (!session) {
        await this.sendMessage(
          phoneNumber,
          "Session not found. Use: /start <your_user_id> to begin."
        );
        return;
      }

      if (!session.userId) {
        await this.sendMessage(phoneNumber, "Please use: /start <your_user_id> first.");
        return;
      }

      // Handle conversation steps
      if (session.step === "awaiting_post_type") {
        const choice = parseInt(messageBody, 10);
        if (choice < 1 || choice > POST_TYPES.length) {
          await this.sendMessage(phoneNumber, "Invalid choice. Please pick 1-6.");
          return;
        }
        session.postType = POST_TYPES[choice - 1].value;
        session.platforms = [];
        session.step = "awaiting_platforms";
        await this.saveSession(session);

        await this.sendMessage(
          phoneNumber,
          "Select platforms (comma-separated: 1=twitter,2=linkedin,3=instagram,4=threads):\n" +
            PLATFORMS.map((p, i) => `${i + 1}. ${p}`).join("\n")
        );
        return;
      }

      if (session.step === "awaiting_platforms") {
        const choices = messageBody.split(",").map((s) => parseInt(s.trim(), 10));
        const selected: ContentPlatform[] = [];

        for (const choice of choices) {
          if (choice < 1 || choice > PLATFORMS.length) {
            await this.sendMessage(phoneNumber, `Invalid choice: ${choice}. Pick 1-4.`);
            return;
          }
          selected.push(PLATFORMS[choice - 1]);
        }

        if (selected.length === 0) {
          await this.sendMessage(phoneNumber, "Pick at least one platform.");
          return;
        }

        session.platforms = selected;
        session.step = "awaiting_tone";
        await this.saveSession(session);

        await this.sendMessage(
          phoneNumber,
          "Choose tone (1-5):\n" + TONES.map((t, i) => `${i + 1}. ${t}`).join("\n")
        );
        return;
      }

      if (session.step === "awaiting_tone") {
        const choice = parseInt(messageBody, 10);
        if (choice < 1 || choice > TONES.length) {
          await this.sendMessage(phoneNumber, "Invalid choice. Pick 1-5.");
          return;
        }
        session.tone = TONES[choice - 1];
        session.step = "awaiting_model";
        await this.saveSession(session);

        await this.sendMessage(
          phoneNumber,
          "Choose AI model (1-3):\n" + MODELS.map((m, i) => `${i + 1}. ${m}`).join("\n")
        );
        return;
      }

      if (session.step === "awaiting_model") {
        const choice = parseInt(messageBody, 10);
        if (choice < 1 || choice > MODELS.length) {
          await this.sendMessage(phoneNumber, "Invalid choice. Pick 1-3.");
          return;
        }
        session.model = MODELS[choice - 1];
        session.step = "awaiting_idea";
        await this.saveSession(session);

        await this.sendMessage(phoneNumber, "Send your idea (max 500 characters):");
        return;
      }

      if (session.step === "awaiting_idea") {
        if (!messageBody || messageBody.length > 500) {
          await this.sendMessage(phoneNumber, "Idea too long or empty. Max 500 characters.");
          return;
        }

        if (!session.postType || !session.tone || !session.model || session.platforms.length === 0) {
          await this.sendMessage(phoneNumber, "Session incomplete. Use /start to restart.");
          await this.saveSession(this.createEmptySession(phoneNumber));
          return;
        }

        session.idea = messageBody;
        await this.saveSession(session);
        await this.sendMessage(phoneNumber, "Generating preview...");

        try {
          const generated = await contentService.generate(session.userId, {
            idea: messageBody,
            postType: session.postType as PostType,
            platforms: session.platforms as ContentPlatform[],
            tone: session.tone as ToneType,
            language: "en",
            model: session.model as BotModel,
          });

          const previewText = session.platforms
            .map((platform) => {
              const p = generated.platforms[platform];
              return `${platform}: (${p.characterCount} chars)\n${p.content}`;
            })
            .join("\n\n");

          session.preview = generated.platforms;
          session.step = "preview";
          await this.saveSession(session);

          await this.sendMessage(phoneNumber, `Preview:\n\n${previewText}\n\nReply 'yes' to post or 'no' to edit.`);
        } catch (error) {
          logger.error("WhatsApp content generation failed", error);
          await this.sendMessage(phoneNumber, "Could not generate preview. Please retry.");
          await this.saveSession(this.createEmptySession(phoneNumber));
        }
        return;
      }

      if (session.step === "preview") {
        const response = messageBody.toLowerCase();

        if (response === "yes") {
          if (!session.preview || !session.idea || !session.model) {
            await this.sendMessage(phoneNumber, "No preview to confirm.");
            return;
          }

          await this.sendMessage(phoneNumber, "Publishing...");

          try {
            const platformContents: Record<string, { content: string }> = {};
            for (const platform of session.platforms) {
              platformContents[platform] = {
                content: session.preview[platform]?.content || "",
              };
            }

            const result = await postsService.publish(session.userId, {
              idea: session.idea,
              platforms: session.platforms as ContentPlatform[],
              platformContents,
              language: "en",
              model: session.model as BotModel,
            });

            await this.sendMessage(phoneNumber, `✅ Posted! ID: ${result.id}`);
            await this.saveSession(this.createEmptySession(phoneNumber));
          } catch (error) {
            logger.error("WhatsApp publish failed", error);
            await this.sendMessage(phoneNumber, "Failed to publish. Try again later.");
          }
        } else if (response === "no") {
          session.step = "awaiting_idea";
          session.idea = undefined;
          session.preview = undefined;
          await this.saveSession(session);
          await this.sendMessage(phoneNumber, "Send a new idea:");
        } else {
          await this.sendMessage(phoneNumber, "Please reply 'yes' or 'no'.");
        }
        return;
      }

      await this.sendMessage(phoneNumber, "Unknown command. Use /start to begin.");
    } catch (error) {
      logger.error("WhatsApp message handling error", error);
      await this.sendMessage(phoneNumber, "An error occurred. Please try again.");
    }
  }

  private async sendMessage(toPhoneNumber: string, text: string): Promise<void> {
    if (!this.twilioClient) return;

    try {
      await this.twilioClient.messages.create({
        body: text,
        from: this.fromNumber,
        to: `whatsapp:+${toPhoneNumber}`,
      });
    } catch (error) {
      logger.error("Failed to send WhatsApp message", error);
    }
  }

  private async getSession(phoneNumber: string): Promise<WhatsAppSession | null> {
    const raw = await redis.get(sessionKey(phoneNumber));
    if (!raw) return null;

    const session = JSON.parse(raw) as WhatsAppSession;
    await redis.expire(sessionKey(phoneNumber), SESSION_TTL_SECONDS);
    return session;
  }

  private async saveSession(session: WhatsAppSession): Promise<void> {
    const next = { ...session, updatedAt: new Date().toISOString() };
    await redis.set(sessionKey(session.phoneNumber), JSON.stringify(next), "EX", SESSION_TTL_SECONDS);
  }

  private createEmptySession(phoneNumber: string): WhatsAppSession {
    return {
      phoneNumber,
      step: "idle",
      platforms: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export const whatsappService = new WhatsAppService();
