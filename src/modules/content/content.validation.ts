/**
 * Content module — Zod validation schemas.
 */
import { z } from "zod";

export const createContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  type: z.enum(["article", "snippet", "media"]).optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
