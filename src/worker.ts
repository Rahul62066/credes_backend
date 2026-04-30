/**
 * Worker entrypoint — start background workers without web server/bots.
 *
 * Use in production as a separate Render background worker service.
 */
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function bootstrap() {
  logger.info("Starting background workers");
  // Import workers (this file starts BullMQ workers)
  await import("./workers");
  logger.info("Workers initialised");

  // Keep the process alive
  process.on("SIGINT", () => {
    logger.info("SIGINT received — exiting worker");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received — exiting worker");
    process.exit(0);
  });
}

bootstrap();
