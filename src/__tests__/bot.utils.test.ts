import {
  formatSelectedPlatforms,
  hasInstagram,
  isValidPublicMediaUrl,
  normalizePlatformSelection,
  selectAllTelegramPlatforms,
} from "../modules/bot/bot.utils";

describe("Telegram bot platform helpers", () => {
  it("selects all platforms in the expected order", () => {
    expect(selectAllTelegramPlatforms()).toEqual(["twitter", "linkedin", "instagram", "threads"]);
  });

  it("deduplicates platform selections while preserving canonical order", () => {
    expect(normalizePlatformSelection(["threads", "twitter", "twitter", "instagram"])).toEqual([
      "twitter",
      "instagram",
      "threads",
    ]);
  });

  it("formats selected platforms for preview output", () => {
    expect(formatSelectedPlatforms(["linkedin", "twitter"])).toBe("Twitter/X, LinkedIn");
  });

  it("detects when instagram is part of the selection", () => {
    expect(hasInstagram(["twitter", "instagram"])).toBe(true);
    expect(hasInstagram(["twitter", "threads"])).toBe(false);
  });

  it("validates public media URLs", () => {
    expect(isValidPublicMediaUrl("https://example.com/image.jpg")).toBe(true);
    expect(isValidPublicMediaUrl("http://example.com/video.mp4")).toBe(true);
    expect(isValidPublicMediaUrl("ftp://example.com/image.jpg")).toBe(false);
    expect(isValidPublicMediaUrl("not-a-url")).toBe(false);
    expect(isValidPublicMediaUrl("  ")).toBe(false);
  });
});