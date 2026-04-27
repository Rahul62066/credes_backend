import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
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

  // Social platform APIs
  TWITTER_API_BASE_URL: process.env.TWITTER_API_BASE_URL || "https://api.twitter.com",
  LINKEDIN_API_BASE_URL: process.env.LINKEDIN_API_BASE_URL || "https://api.linkedin.com",

  // BullMQ
  BULL_QUEUE_PREFIX: process.env.BULL_QUEUE_PREFIX || "postly",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Helpers
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const;
