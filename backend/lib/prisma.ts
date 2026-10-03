import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL chưa được cấu hình");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Next dev preserves globals across hot reloads. A client created before the
// MatchParticipant model was generated cannot serve the new join endpoints.
const cachedClient = globalForPrisma.prisma;
const schemaVersion = "match-notifications-v1";
const prisma =
  (cachedClient?.matchParticipant && globalForPrisma.prismaSchemaVersion === schemaVersion ? cachedClient : undefined) ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = schemaVersion;
}

export default prisma;
