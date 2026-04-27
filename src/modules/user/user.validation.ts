/**
 * User module — Zod validation schemas.
 */
import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
