import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Reuse a single client across hot reloads in dev and across invocations
// that share a warm serverless instance in production.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = db;
