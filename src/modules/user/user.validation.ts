/**
 * User module — Zod validation schemas.
 */
import { z } from "zod";

// ── Profile ──────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name must not be empty").max(100).optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  defaultTone: z
    .enum([
      "PROFESSIONAL",
      "CASUAL",
      "WITTY",
      "AUTHORITATIVE",
      "FRIENDLY",
    ])
    .optional(),
  defaultLanguage: z.string().min(2).max(10).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ── Social Account ───────────────────────────────────

const platformEnum = z.enum([
  "TWITTER",
  "LINKEDIN",
  "INSTAGRAM",
  "THREADS",
  "FACEBOOK",
]);

export const connectSocialAccountSchema = z.object({
  platform: platformEnum,
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().optional(),
  handle: z.string().optional(),
});

export const socialAccountIdParamSchema = z.object({
  id: z.string().min(1, "Social account ID is required"),
});

export type ConnectSocialAccountInput = z.infer<typeof connectSocialAccountSchema>;

// ── AI Keys ──────────────────────────────────────────

export const updateAiKeysSchema = z
  .object({
    openaiKey: z.string().min(1).optional(),
    anthropicKey: z.string().min(1).optional(),
    openrouterKey: z.string().min(1).optional(),
  })
  .refine((data) => data.openaiKey || data.anthropicKey || data.openrouterKey, {
    message: "At least one API key is required",
  });

export type UpdateAiKeysInput = z.infer<typeof updateAiKeysSchema>;
