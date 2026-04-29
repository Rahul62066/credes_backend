/**
 * Server entry point.
 * Starts the Express server and initialises background workers.
 */
import { app } from "./app";
import { env } from "./config/env";
import { disconnectPrisma } from "./config/prisma";
import { redis } from "./config/redis";
import { botService } from "./modules/bot";
import { whatsappService } from "./modules/whatsapp";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Postly API running on http://localhost:${env.PORT}`);
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
  });

  // ── Start BullMQ workers (only outside test) ──────
  if (!env.isTest) {
    await import("./workers");
    logger.info("👷 Workers initialised");
    await botService.initialize();
    logger.info("🤖 Telegram bot initialised");
    whatsappService.initialize();
    logger.info("💬 WhatsApp bot initialised");
  }

  // ── Graceful shutdown ─────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received — shutting down gracefully…`);

    server.close(async () => {
      await disconnectPrisma();
      await redis.quit();
      logger.info("👋 Bye!");
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error("⚠️  Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // ── Uncaught errors ───────────────────────────────
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err);
    process.exit(1);
  });
}

bootstrap();
