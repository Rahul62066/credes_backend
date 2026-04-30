import type { ContentPlatform } from "./whatsapp.validation";

export const WHATSAPP_PLATFORM_OPTIONS: Array<{ label: string; value: ContentPlatform }> = [
  { label: "Twitter/X", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Instagram", value: "instagram" },
  { label: "Threads", value: "threads" },
];

export const WHATSAPP_INSTAGRAM_MEDIA_PROMPT =
  "Please send a public image/video URL for Instagram publishing.";

export function hasInstagram(platforms: ContentPlatform[]): boolean {
  return platforms.includes("instagram");
}

export function formatSelectedPlatforms(platforms: ContentPlatform[]): string {
  return platforms
    .map((platform) => WHATSAPP_PLATFORM_OPTIONS.find((option) => option.value === platform)?.label || platform)
    .join(", ");
}

export function isValidPublicMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}