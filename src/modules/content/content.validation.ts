/**
 * Content module — Zod validation schemas.
 */
import { z } from "zod";

// ── Enums ────────────────────────────────────────────

export const contentPlatformEnum = z.enum([
  "twitter",
  "linkedin",
  "instagram",
  "threads",
]);

export const postTypeEnum = z.enum([
  "announcement",
  "thread",
  "story",
  "promotional",
  "educational",
  "opinion",
]);

export const toneEnum = z.enum([
  "professional",
  "casual",
  "witty",
  "authoritative",
  "friendly",
]);

export const languageEnum = z.enum(["en", "hi", "ar"]);

export const modelEnum = z.enum(["openai", "anthropic", "openrouter"]);

// ── Request schema ───────────────────────────────────

export const generateContentSchema = z.object({
  idea: z
    .string()
    .min(1, "Idea is required")
    .max(500, "Idea must be 500 characters or less"),
  post_type: postTypeEnum,
  platforms: z.array(contentPlatformEnum).min(1, "At least one platform is required"),
  tone: toneEnum,
  language: languageEnum.default("en"),
  model: modelEnum,
});

export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type ContentPlatform = z.infer<typeof contentPlatformEnum>;
export type PostType = z.infer<typeof postTypeEnum>;
export type ToneType = z.infer<typeof toneEnum>;

// ── AI output validation ─────────────────────────────

export const platformContentOutputSchema = z.object({
  content: z.string().min(1),
  hashtags: z.array(z.string()),
  characterCount: z.number(),
});

// Allow AI to return only a subset of platforms (keys will be platform names).
// We validate keys later against requestedPlatforms in the service layer.
export const generateOutputSchema = z.record(z.string(), platformContentOutputSchema);

export interface GenerateServiceInput {
  idea: string;
  postType: PostType;
  platforms: ContentPlatform[];
  tone: ToneType;
  language: z.infer<typeof languageEnum>;
  model: z.infer<typeof modelEnum>;
}

export function toGenerateServiceInput(input: GenerateContentInput): GenerateServiceInput {
  return {
    idea: input.idea,
    postType: input.post_type,
    platforms: input.platforms,
    tone: input.tone,
    language: input.language,
    model: input.model,
  };
}

export type PlatformContentOutput = z.infer<typeof platformContentOutputSchema>;
export type GenerateOutput = z.infer<typeof generateOutputSchema>;

export interface GeneratedPlatformResult {
  content: string;
  hashtags: string[];
  char_count: number;
}

export interface GenerateServiceResponse {
  generated: Record<string, GeneratedPlatformResult>;
  model_used: string;
  tokens_used: number;
}
