import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

/**
 * Prisma 7 requires a driver adapter for direct database connections.
 * We use @prisma/adapter-pg with the `pg` Pool.
 *
 * The client is created lazily so that importing this module in tests
 * does not immediately crash when DATABASE_URL is absent.
 */

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: env.isDev ? ["query", "info", "warn", "error"] : ["error"],
  });
}

/**
 * Lazily-initialised Prisma client singleton.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = createPrismaClient();
  }
  return globalForPrisma.__prisma;
}

/** Convenience accessor — use in application code. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return (getPrisma() as any)[prop];
  },
});

/**
 * Gracefully disconnect Prisma on shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.__prisma) {
    await globalForPrisma.__prisma.$disconnect();
    globalForPrisma.__prisma = undefined;
    console.log("🔌 Prisma disconnected");
  }
}
