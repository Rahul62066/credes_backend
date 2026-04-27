import { PrismaClient, Tone } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Seed User ───────────────────────────────────
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@postly.app" },
    update: {},
    create: {
      email: "demo@postly.app",
      passwordHash,
      name: "Demo User",
      bio: "Exploring Postly 🚀",
      defaultTone: Tone.CASUAL,
      defaultLanguage: "en",
    },
  });

  console.log(`  ✅ User: ${user.email} (${user.id})`);
  console.log("\n🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
