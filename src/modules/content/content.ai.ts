/**
 * Content module — AI provider abstraction.
 *
 * Wraps OpenAI, Anthropic, and OpenRouter SDK access behind a unified interface.
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "../../utils/appError";
import { logger } from "../../utils/logger";

export interface AiGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  apiKey: string;
}

export interface AiClient {
  generate(params: AiGenerateParams): Promise<string>;
}

export type AiProvider = "openai" | "anthropic" | "openrouter";

// ── OpenAI ───────────────────────────────────────────

export class OpenAIClient implements AiClient {
  async generate({ systemPrompt, userPrompt, apiKey }: AiGenerateParams): Promise<string> {
    try {
      const client = new OpenAI({ apiKey });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new AppError("OpenAI returned empty response", 502);
      }

      logger.debug("OpenAI raw response", { length: text.length });
      return text;
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      // Surface specific API errors
      const status = err?.status || err?.response?.status || 502;
      const msg = err?.message || "OpenAI API request failed";

      logger.error("OpenAI API error", { status, message: msg });
      throw new AppError(
        status === 401
          ? "Invalid OpenAI API key"
          : `OpenAI error: ${msg}`,
        status >= 400 && status < 500 ? status : 502
      );
    }
  }
}

// ── OpenRouter ──────────────────────────────────────

export class OpenRouterClient implements AiClient {
  async generate({ systemPrompt, userPrompt, apiKey }: AiGenerateParams): Promise<string> {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const response = await client.chat.completions.create({
        model: "openai/gpt-4o",
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new AppError("OpenRouter returned empty response", 502);
      }

      logger.debug("OpenRouter raw response", { length: text.length });
      return text;
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      const status = err?.status || err?.response?.status || 502;
      const msg = err?.message || "OpenRouter API request failed";

      logger.error("OpenRouter API error", { status, message: msg });
      throw new AppError(
        status === 401
          ? "Invalid OpenRouter API key"
          : `OpenRouter error: ${msg}`,
        status >= 400 && status < 500 ? status : 502
      );
    }
  }
}

// ── Anthropic ────────────────────────────────────────

export class AnthropicClient implements AiClient {
  async generate({ systemPrompt, userPrompt, apiKey }: AiGenerateParams): Promise<string> {
    try {
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const block = response.content[0];
      if (!block || block.type !== "text") {
        throw new AppError("Anthropic returned empty response", 502);
      }

      logger.debug("Anthropic raw response", { length: block.text.length });
      return block.text;
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      const status = err?.status || 502;
      const msg = err?.message || "Anthropic API request failed";

      logger.error("Anthropic API error", { status, message: msg });
      throw new AppError(
        status === 401
          ? "Invalid Anthropic API key"
          : `Anthropic error: ${msg}`,
        status >= 400 && status < 500 ? status : 502
      );
    }
  }
}

// ── Factory ──────────────────────────────────────────

const clients: Record<string, AiClient> = {
  openai: new OpenAIClient(),
  anthropic: new AnthropicClient(),
  openrouter: new OpenRouterClient(),
};

export function getAiClient(model: AiProvider): AiClient {
  return clients[model];
}
