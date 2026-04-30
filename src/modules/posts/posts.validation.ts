/**
 * Posts module — Zod validation schemas.
 */
import { z } from "zod";

export const platformEnum = z.enum(["twitter", "linkedin", "instagram", "threads"]);

export const postStatusFilterEnum = z.enum([
  "draft",
  "scheduled",
  "processing",
  "published",
  "partially_published",
  "failed",
  "cancelled",
]);

const platformContentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  mediaUrl: z.string().url("mediaUrl must be a valid URL").optional(), // For Instagram, Threads
});

export const publishPostSchema = z.object({
  idea: z.string().min(1, "Idea is required").max(500, "Idea must be 500 characters or less"),
  platforms: z.array(platformEnum).min(1, "At least one platform is required"),
  platformContents: z.record(platformEnum, platformContentSchema),
  language: z.enum(["en", "hi", "ar"]).default("en"),
  model: z.enum(["openai", "anthropic", "openrouter"]).optional(),
});

export const schedulePostSchema = publishPostSchema.extend({
  publishAt: z.string().datetime("publishAt must be a valid ISO datetime"),
});

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: postStatusFilterEnum.optional(),
  platform: platformEnum.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const postIdParamSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
});

export type PublishPostInput = z.infer<typeof publishPostSchema>;
export type SchedulePostInput = z.infer<typeof schedulePostSchema>;
export type ListPostsQueryInput = z.infer<typeof listPostsQuerySchema>;
