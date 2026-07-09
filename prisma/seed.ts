/**
 * Database seed entrypoint (`npm run db:seed`).
 * Rebuilds the shared demo workspace with realistic pipeline data.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedDemoWorkspace } from "../src/server/demo/seed-demo";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const result = await seedDemoWorkspace(prisma);
    console.log("Seeded demo workspace:", result.counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
