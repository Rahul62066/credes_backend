import { PrismaClient } from "../../generated/prisma";
import { env } from "./env";

/**
 * Prisma client singleton.
 * Logs queries in development mode for debugging.
 */
export const prisma = new PrismaClient({
  log: env.isDev ? ["query", "info", "warn", "error"] : ["error"],
});

/**
 * Gracefully disconnect Prisma on shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  console.log("🔌 Prisma disconnected");
}
