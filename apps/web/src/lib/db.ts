import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

function createPrismaClient(url?: string) {
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const databaseUrl = process.env.DATABASE_URL;

// Hot env reload can set DATABASE_URL after the first request cached a broken client.
if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== databaseUrl) {
  void globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = createPrismaClient(databaseUrl);
  globalForPrisma.prismaUrl = databaseUrl;
}

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
