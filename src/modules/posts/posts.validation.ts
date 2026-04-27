/**
 * Posts module — Zod validation schemas.
 */
import { z } from "zod";

export const createPostSchema = z.object({
  contentId: z.string().min(1, "Content ID is required"),
  platform: z.enum(["twitter", "linkedin", "facebook", "instagram"]),
  scheduledAt: z.string().datetime().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
