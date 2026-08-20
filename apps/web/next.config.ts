import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma outside the webpack bundle so it reads process.env.DATABASE_URL at runtime
  // (bundling can inline a missing URL as undefined for the life of the dev server).
  serverExternalPackages: ["@prisma/client", "prisma", "ioredis"],
};

export default nextConfig;
