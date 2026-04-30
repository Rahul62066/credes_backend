/**
 * WhatsApp module — Zod validation schemas for Twilio incoming webhooks.
 */
import { z } from "zod";

/**
 * Twilio WhatsApp webhook payload schema.
 * Twilio sends messages via webhook with these fields.
 */
export const twilioIncomingMessageSchema = z.object({
  MessageSid: z.string(),
  ProfileName: z.string().optional(),
  WaId: z.string(), // WhatsApp user ID (phone number)
  Timestamp: z.string(),
  From: z.string(), // e.g., "whatsapp:+1234567890"
  Body: z.string().optional(),
  MediaContentType: z.string().optional(),
  MediaUrl: z.string().optional(),
});

export type TwilioIncomingMessage = z.infer<typeof twilioIncomingMessageSchema>;

/**
 * WhatsApp session stored in Redis.
 */
export interface WhatsAppSession {
  phoneNumber: string;
  userId?: string; // Linked user ID after /start
  step:
    | "idle"
    | "awaiting_user_id"
    | "awaiting_post_type"
    | "awaiting_platforms"
    | "awaiting_instagram_media"
    | "awaiting_tone"
    | "awaiting_model"
    | "awaiting_idea"
    | "preview";
  postType?: string;
  platforms: string[];
  instagramMediaUrl?: string; // URL for Instagram media when platform selected
  tone?: string;
  model?: string;
  idea?: string;
  preview?: Record<string, { content: string; hashtags: string[]; char_count: number }>;
  updatedAt: string;
}

export type PostType = "announcement" | "thread" | "story" | "promotional" | "educational" | "opinion";
export type ContentPlatform = "twitter" | "linkedin" | "instagram" | "threads";
export type ToneType = "professional" | "casual" | "witty" | "authoritative" | "friendly";
export type BotModel = "openai" | "anthropic" | "openrouter";
