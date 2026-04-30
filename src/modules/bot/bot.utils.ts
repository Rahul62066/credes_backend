import type { ContentPlatform } from "../content/content.validation";

export const TELEGRAM_PLATFORM_OPTIONS: Array<{ label: string; value: ContentPlatform }> = [
  { label: "Twitter/X", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Instagram", value: "instagram" },
  { label: "Threads", value: "threads" },
];

export const TELEGRAM_PLATFORM_ORDER: ContentPlatform[] = [
  "twitter",
  "linkedin",
  "instagram",
  "threads",
];

export function normalizePlatformSelection(platforms: ContentPlatform[]): ContentPlatform[] {
  const unique = new Set(platforms);
  return TELEGRAM_PLATFORM_ORDER.filter((platform) => unique.has(platform));
}

export function selectAllTelegramPlatforms(): ContentPlatform[] {
  return [...TELEGRAM_PLATFORM_ORDER];
}

export function formatSelectedPlatforms(platforms: ContentPlatform[]): string {
  const normalized = normalizePlatformSelection(platforms);
  return normalized
    .map((platform) => TELEGRAM_PLATFORM_OPTIONS.find((option) => option.value === platform)?.label || platform)
    .join(", ");
}

export function hasInstagram(platforms: ContentPlatform[]): boolean {
  return platforms.includes("instagram");
}
