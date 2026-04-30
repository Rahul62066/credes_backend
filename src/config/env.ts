import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  APP_BASE_URL: process.env.APP_BASE_URL || "",

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
  REDIS_URL: process.env.REDIS_URL || undefined,
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",

  // Encryption (AES-256-GCM)
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",

  // AI API keys (platform fallback)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",

  // Social platform APIs
  TWITTER_API_BASE_URL:
    process.env.TWITTER_API_BASE_URL || "https://api.twitter.com",
  LINKEDIN_API_BASE_URL:
    process.env.LINKEDIN_API_BASE_URL || "https://api.linkedin.com",
  META_API_BASE_URL:
    process.env.META_API_BASE_URL || "https://graph.facebook.com",
  META_API_VERSION: process.env.META_API_VERSION || "v19.0",

  // OAuth providers
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID || "",
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET || "",
  TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI || "",
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || "",
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || "",
  LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || "",
  META_CLIENT_ID: process.env.META_CLIENT_ID || "",
  META_CLIENT_SECRET: process.env.META_CLIENT_SECRET || "",
  META_REDIRECT_URI: process.env.META_REDIRECT_URI || "",

  // BullMQ
  BULL_QUEUE_PREFIX: process.env.BULL_QUEUE_PREFIX || "postly",

  // Telegram bot
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL || "",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",

  // Telegram webhook verification toggle (useful for local dev)
  TELEGRAM_VERIFY_WEBHOOK:
    (process.env.TELEGRAM_VERIFY_WEBHOOK || "false") === "true",

  // Twilio WhatsApp
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || "",
  TWILIO_WEBHOOK_URL: process.env.TWILIO_WEBHOOK_URL || "",
  TWILIO_VERIFY_WEBHOOK:
    (process.env.TWILIO_VERIFY_WEBHOOK || "true") === "true",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Helpers
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  // Runtime flags
  RUN_WORKERS: (process.env.RUN_WORKERS || "false") === "true",
} as const;

// Rate limit defaults
export const rateLimitConfig = {
  content: {
    windowSeconds: parseInt(
      process.env.RATE_LIMIT_CONTENT_WINDOW_SECONDS || String(15 * 60),
      10,
    ),
    max: parseInt(process.env.RATE_LIMIT_CONTENT_MAX || "10", 10),
  },
  publish: {
    windowSeconds: parseInt(
      process.env.RATE_LIMIT_PUBLISH_WINDOW_SECONDS || String(60 * 60),
      10,
    ),
    max: parseInt(process.env.RATE_LIMIT_PUBLISH_MAX || "20", 10),
  },
};
