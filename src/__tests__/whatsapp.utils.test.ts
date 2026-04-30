import {
  formatSelectedPlatforms,
  hasInstagram,
  isValidPublicMediaUrl,
  WHATSAPP_PLATFORM_OPTIONS,
  WHATSAPP_INSTAGRAM_MEDIA_PROMPT,
} from "../modules/whatsapp/whatsapp.utils";

describe("WhatsApp bot platform helpers", () => {
  it("exports platform options with labels", () => {
    expect(WHATSAPP_PLATFORM_OPTIONS).toEqual([
      { label: "Twitter/X", value: "twitter" },
      { label: "LinkedIn", value: "linkedin" },
      { label: "Instagram", value: "instagram" },
      { label: "Threads", value: "threads" },
    ]);
  });

  it("exports the correct Instagram media prompt", () => {
    expect(WHATSAPP_INSTAGRAM_MEDIA_PROMPT).toBe(
      "Please send a public image/video URL for Instagram publishing."
    );
  });

  it("formats selected platforms for preview output", () => {
    expect(formatSelectedPlatforms(["linkedin", "twitter"])).toBe("LinkedIn, Twitter/X");
    expect(formatSelectedPlatforms(["instagram"])).toBe("Instagram");
    expect(formatSelectedPlatforms(["twitter", "linkedin", "instagram", "threads"])).toBe(
      "Twitter/X, LinkedIn, Instagram, Threads"
    );
  });

  it("detects when instagram is part of the selection", () => {
    expect(hasInstagram(["twitter", "instagram"])).toBe(true);
    expect(hasInstagram(["twitter", "threads"])).toBe(false);
    expect(hasInstagram(["instagram"])).toBe(true);
    expect(hasInstagram([])).toBe(false);
  });

  it("validates public media URLs", () => {
    expect(isValidPublicMediaUrl("https://example.com/image.jpg")).toBe(true);
    expect(isValidPublicMediaUrl("http://example.com/video.mp4")).toBe(true);
    expect(isValidPublicMediaUrl("https://cdn.example.com/path/to/media.png")).toBe(true);
    expect(isValidPublicMediaUrl("ftp://example.com/image.jpg")).toBe(false);
    expect(isValidPublicMediaUrl("not-a-url")).toBe(false);
    expect(isValidPublicMediaUrl("")).toBe(false);
    expect(isValidPublicMediaUrl("  ")).toBe(false);
    expect(isValidPublicMediaUrl("example.com/image.jpg")).toBe(false); // missing protocol
  });
});
