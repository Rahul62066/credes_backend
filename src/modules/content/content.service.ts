/**
 * Content module — Service layer.
 *
 * Orchestrates AI content generation:
 * 1. Resolve API key (user's saved key → platform fallback)
 * 2. Build platform-specific prompts
 * 3. Call AI provider
 * 4. Parse & validate JSON output
 * 5. Apply post-processing (character count verification, warnings)
 */
import { env } from "../../config/env";
import { decrypt } from "../../utils/encryption";
import { AppError, BadRequest } from "../../utils/appError";
import { logger } from "../../utils/logger";
import { contentRepository, ContentRepository } from "./content.repository";
import { getAiClient } from "./content.ai";
import { buildSystemPrompt, buildUserPrompt } from "./content.prompts";
import {
  generateOutputSchema,
  type GenerateContentInput,
  type GenerateOutput,
  type ContentPlatform,
} from "./content.validation";

// ── Platform character limits for validation ─────────

const PLATFORM_LIMITS: Record<ContentPlatform, { maxChars: number; minHashtags: number; maxHashtags: number }> = {
  twitter: { maxChars: 280, minHashtags: 2, maxHashtags: 3 },
  linkedin: { maxChars: 1300, minHashtags: 3, maxHashtags: 5 },
  instagram: { maxChars: 2200, minHashtags: 10, maxHashtags: 15 },
  threads: { maxChars: 500, minHashtags: 2, maxHashtags: 4 },
};

export class ContentService {
  constructor(private repo: ContentRepository = contentRepository) {}

  async generate(userId: string, input: GenerateContentInput) {
    // 1. Resolve API key
    const apiKey = await this.resolveApiKey(userId, input.model);

    // 2. Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      idea: input.idea,
      postType: input.postType,
      platforms: input.platforms,
      tone: input.tone,
      language: input.language,
    });

    // 3. Call AI
    const client = getAiClient(input.model);
    const rawResponse = await client.generate({
      systemPrompt,
      userPrompt,
      apiKey,
    });

    // 4. Parse JSON
    const parsed = this.parseAiResponse(rawResponse);

    // 5. Validate & annotate
    const result = this.validateAndAnnotate(parsed, input.platforms);

    return {
      platforms: result,
      model: input.model,
      postType: input.postType,
      tone: input.tone,
      language: input.language,
    };
  }

  // ── Private helpers ─────────────────────────────

  /**
   * Resolve the API key to use:
   *   1. User's saved encrypted key (decrypted)
   *   2. Platform fallback from env
   */
  private async resolveApiKey(userId: string, model: "openai" | "anthropic"): Promise<string> {
    // Try user's saved key
    const aiKey = await this.repo.findUserAiKey(userId);

    if (aiKey) {
      const encryptedField = model === "openai" ? aiKey.openaiKeyEnc : aiKey.anthropicKeyEnc;
      if (encryptedField) {
        try {
          const decrypted = decrypt(encryptedField);
          if (decrypted) {
            logger.debug(`Using user's saved ${model} key`);
            return decrypted;
          }
        } catch {
          logger.warn(`Failed to decrypt user's ${model} key, falling back to platform key`);
        }
      }
    }

    // Fallback to platform key
    const fallback = model === "openai" ? env.OPENAI_API_KEY : env.ANTHROPIC_API_KEY;
    if (!fallback) {
      throw BadRequest(
        `No ${model} API key available. Please save your API key in settings or contact the administrator.`
      );
    }

    logger.debug(`Using platform fallback ${model} key`);
    return fallback;
  }

  /**
   * Parse the raw AI text response into a typed object.
   * Strips markdown code fences if present.
   */
  private parseAiResponse(raw: string): Record<string, unknown> {
    // Strip code fences the AI might have added despite instructions
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      logger.error("AI returned invalid JSON", { raw: raw.substring(0, 200) });
      throw new AppError("AI returned invalid JSON. Please try again.", 502);
    }
  }

  /**
   * Validate AI output against expected schema and platform constraints.
   * Returns annotated result with warnings for any violations.
   */
  private validateAndAnnotate(
    parsed: Record<string, unknown>,
    requestedPlatforms: ContentPlatform[]
  ): Record<string, { content: string; hashtags: string[]; characterCount: number; warnings: string[] }> {
    // Schema validation
    const zodResult = generateOutputSchema.safeParse(parsed);

    // Even if Zod fails, try to extract what we can
    const output: GenerateOutput = zodResult.success
      ? zodResult.data
      : (parsed as GenerateOutput);

    const result: Record<
      string,
      { content: string; hashtags: string[]; characterCount: number; warnings: string[] }
    > = {};

    for (const platform of requestedPlatforms) {
      const data = output[platform];
      const warnings: string[] = [];

      if (!data || !data.content) {
        result[platform] = {
          content: "",
          hashtags: [],
          characterCount: 0,
          warnings: [`AI did not generate content for ${platform}`],
        };
        continue;
      }

      // Recalculate actual character count
      const actualLength = data.content.length;
      if (data.characterCount !== actualLength) {
        warnings.push(
          `Character count corrected: AI reported ${data.characterCount}, actual is ${actualLength}`
        );
      }

      // Check character limits
      const limits = PLATFORM_LIMITS[platform];
      if (actualLength > limits.maxChars) {
        warnings.push(
          `Content exceeds ${platform} limit: ${actualLength}/${limits.maxChars} chars`
        );
      }

      // Check hashtag count
      const hashtagCount = data.hashtags?.length || 0;
      if (hashtagCount < limits.minHashtags) {
        warnings.push(
          `Too few hashtags for ${platform}: ${hashtagCount} (min ${limits.minHashtags})`
        );
      }
      if (hashtagCount > limits.maxHashtags) {
        warnings.push(
          `Too many hashtags for ${platform}: ${hashtagCount} (max ${limits.maxHashtags})`
        );
      }

      result[platform] = {
        content: data.content,
        hashtags: data.hashtags || [],
        characterCount: actualLength,
        warnings,
      };
    }

    return result;
  }
}

export const contentService = new ContentService();
