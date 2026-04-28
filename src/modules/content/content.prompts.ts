/**
 * Content module — Platform-specific prompt builder.
 *
 * Generates a detailed system + user prompt that instructs the AI to
 * produce platform-tailored social media content as JSON.
 */
import type { ContentPlatform, PostType, ToneType } from "./content.validation";

// ── Per-platform constraints ─────────────────────────

interface PlatformConstraint {
  name: string;
  maxChars: number;
  hashtagRange: [number, number];
  style: string;
}

const PLATFORM_CONSTRAINTS: Record<ContentPlatform, PlatformConstraint> = {
  twitter: {
    name: "Twitter / X",
    maxChars: 280,
    hashtagRange: [2, 3],
    style:
      "Punchy, concise, hook-driven. Must fit in a single tweet. " +
      "Use line breaks sparingly. Include 2-3 relevant hashtags at the end.",
  },
  linkedin: {
    name: "LinkedIn",
    maxChars: 1300,
    hashtagRange: [3, 5],
    style:
      "Professional, insightful, value-driven. Force professional voice on LinkedIn even if a different global tone is requested. 800-1300 characters. " +
      "Open with a strong hook line. Use short paragraphs and line breaks for readability. " +
      "Include a clear call-to-action. End with 3-5 relevant hashtags on a separate line.",
  },
  instagram: {
    name: "Instagram",
    maxChars: 2200,
    hashtagRange: [10, 15],
    style:
      "Engaging, visually descriptive caption. Use emojis strategically. " +
      "Include a call-to-action (e.g., 'Save this post', 'Tag someone'). " +
      "Add 10-15 niche-relevant hashtags at the end, separated by line breaks.",
  },
  threads: {
    name: "Threads",
    maxChars: 500,
    hashtagRange: [2, 4],
    style:
      "Conversational, authentic, opinion-driven. Max 500 characters. " +
      "Write as if talking to a friend. No corporate jargon. " +
      "Keep hashtags minimal (2-4), blended naturally or at the end.",
  },
};

// ── Language names ───────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ar: "Arabic",
};

// ── Prompt builder ───────────────────────────────────

export function buildSystemPrompt(): string {
  return `You are Postly AI, an expert social media content creator.

RULES:
1. Always respond with ONLY valid JSON — no markdown, no code fences, no explanation.
2. The JSON must match the exact schema requested.
3. "content" must include hashtags inline or appended — they count toward character limits.
4. "characterCount" must be the actual length of "content" (including hashtags and emojis).
5. "hashtags" array should list the hashtags used (without the # symbol).
6. Respect each platform's character limit strictly.
7. Content must be original, not generic filler text.
8. Adapt writing style to the requested tone.
9. Write in the requested language.
10. Never include markdown fences or extra keys; return raw JSON only.

EXAMPLE (must follow exactly):
{
  "twitter": {
    "content": "Launching our AI startup today 🚀 Check out how we scale content. #ai #startup",
    "hashtags": ["ai","startup"],
    "characterCount": 85
  },
  "linkedin": {
    "content": "Today we launch our AI startup. We built a platform to scale content creation... #ai #product",
    "hashtags": ["ai","product"],
    "characterCount": 220
  }
}
Return JSON that matches the schema and the example shape exactly.`;
}

export function buildUserPrompt(params: {
  idea: string;
  postType: PostType;
  platforms: ContentPlatform[];
  tone: ToneType;
  language: string;
}): string {
  const { idea, postType, platforms, tone, language } = params;

  const langName = LANGUAGE_NAMES[language] || language;

  const platformBlocks = platforms
    .map((p) => {
      const c = PLATFORM_CONSTRAINTS[p];
      return [
        `### ${c.name} ("${p}")`,
        `- Max characters: ${c.maxChars}`,
        `- Hashtags: ${c.hashtagRange[0]}-${c.hashtagRange[1]}`,
        `- Style: ${c.style}`,
      ].join("\n");
    })
    .join("\n\n");

  const keys = platforms.map((p) => `"${p}"`).join(", ");

  return `Generate social media content for the following idea.

**Idea:** ${idea}
**Post type:** ${postType}
**Tone:** ${tone}
**Language:** ${langName}

## Platform requirements

${platformBlocks}

## Required JSON output

Return a JSON object with keys: { ${keys} }
Each key maps to:
{
  "content": "<full post text including hashtags>",
  "hashtags": ["tag1", "tag2"],
  "characterCount": <integer>
}
Provide one concrete example output that follows the schema precisely (use realistic text and correct character counts).`;
}
