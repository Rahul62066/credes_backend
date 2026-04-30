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
  type GenerateServiceInput,
  type GenerateOutput,
  type ContentPlatform,
} from "./content.validation";

// ── Platform character limits for validation ─────────

const PLATFORM_LIMITS: Record<
  ContentPlatform,
  { minChars: number; maxChars: number; minHashtags: number; maxHashtags: number }
> = {
  twitter: { minChars: 1, maxChars: 280, minHashtags: 2, maxHashtags: 3 },
  linkedin: { minChars: 800, maxChars: 1300, minHashtags: 3, maxHashtags: 5 },
  instagram: { minChars: 1, maxChars: 2200, minHashtags: 10, maxHashtags: 15 },
  threads: { minChars: 1, maxChars: 500, minHashtags: 2, maxHashtags: 4 },
};

export class ContentService {
  constructor(private repo: ContentRepository = contentRepository) {}

  async generate(userId: string, input: GenerateServiceInput) {
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
    const aiResponse = await client.generate({
      systemPrompt,
      userPrompt,
      apiKey,
    });

    // 4. Parse JSON
    const parsed = this.parseAiResponse(aiResponse.text);

    // 5. Validate & annotate
    const result = this.validateAndAnnotate(parsed, input.platforms);

    return {
      platforms: result,
      model: input.model,
      tokens_used: aiResponse.tokensUsed,
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
  private async resolveApiKey(userId: string, model: GenerateServiceInput["model"]): Promise<string> {
    // Try user's saved key
    const aiKey = await this.repo.findUserAiKey(userId);

    if (aiKey) {
      const encryptedField =
        model === "openai"
          ? aiKey.openaiKeyEnc
          : model === "anthropic"
            ? aiKey.anthropicKeyEnc
            : aiKey.openrouterKeyEnc;
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
    const fallback =
      model === "openai"
        ? env.OPENAI_API_KEY
        : model === "anthropic"
          ? env.ANTHROPIC_API_KEY
          : env.OPENROUTER_API_KEY;
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

    // First attempt: direct JSON.parse
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      logger.warn("Direct JSON.parse failed, attempting extraction", { snippet: cleaned.substring(0, 300) });
    }

    // Attempt to extract the first balanced JSON object from the text
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let candidate = cleaned.substring(firstBrace, lastBrace + 1);

      // Remove trailing commas before closing braces (common LLM mistake)
      candidate = candidate.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

      try {
        return JSON.parse(candidate);
      } catch (err) {
        logger.warn("Extraction parse failed", { candidate: candidate.substring(0, 300) });
      }
    }

    // Try a looser normalization: convert single quotes to double quotes (heuristic)
    const singleQuoteNormalized = cleaned.replace(/\'([^"]*?)\'/g, '"$1"');
    try {
      return JSON.parse(singleQuoteNormalized);
    } catch (err) {
      logger.error("AI returned invalid JSON after fallback attempts", { raw: raw.substring(0, 1000) });
      throw new AppError("AI returned invalid output format. Please try again.", 502);
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
    // Schema validation must pass before any response is sent
    const zodResult = generateOutputSchema.safeParse(parsed);
    if (!zodResult.success) {
      logger.error("AI output schema validation failed", {
        issues: zodResult.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      throw new AppError("AI returned invalid output format. Please try again.", 502);
    }

    const output: GenerateOutput = zodResult.data;

    const result: Record<
      string,
      { content: string; hashtags: string[]; characterCount: number; warnings: string[] }
    > = {};
    const violations: string[] = [];

    for (const platform of requestedPlatforms) {
      const data = output[platform];
      const warnings: string[] = [];

      if (!data || !data.content) {
        violations.push(`${platform}: missing generated content`);
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
      if (actualLength < limits.minChars) {
        const msg = `Content below ${platform} minimum: ${actualLength}/${limits.minChars} chars`;
        warnings.push(msg);
        violations.push(`${platform}: ${msg}`);
      }
      if (actualLength > limits.maxChars) {
        const msg = `Content exceeds ${platform} limit: ${actualLength}/${limits.maxChars} chars`;
        warnings.push(msg);
        violations.push(`${platform}: ${msg}`);
      }

      // Check hashtag count
      const hashtagCount = data.hashtags?.length || 0;
      if (hashtagCount < limits.minHashtags) {
        const msg = `Too few hashtags for ${platform}: ${hashtagCount} (min ${limits.minHashtags})`;
        warnings.push(msg);
        violations.push(`${platform}: ${msg}`);
      }
      if (hashtagCount > limits.maxHashtags) {
        const msg = `Too many hashtags for ${platform}: ${hashtagCount} (max ${limits.maxHashtags})`;
        warnings.push(msg);
        violations.push(`${platform}: ${msg}`);
      }

      result[platform] = {
        content: data.content,
        hashtags: data.hashtags || [],
        characterCount: actualLength,
        warnings,
      };
    }

    // Constraints are advisory: return generated content with warnings so the
    // caller can decide whether to accept or retry.
    if (violations.length > 0) {
      logger.warn("AI content constraint violations", { violations });
    }

    return result;
  }
}

export const contentService = new ContentService();
