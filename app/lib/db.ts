// lib/prisma.ts
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const client = new PrismaClient({ log: ["error"] });

// Intercept User creates — inject username/stageName from name if missing
client.$use(async (params, next) => {
  if (params.model === "User" && params.action === "create") {
    const data = params.args.data;

    if (!data.username) {
      // Use githubId as fallback to guarantee uniqueness
      data.username = data.name?.toLowerCase().replace(/\s+/g, "_")
        ?? `user_${Date.now()}`;
    }

    if (!data.stageName) {
      data.stageName = data.username;
    }
  }
  return next(params);
});

export const prisma = globalForPrisma.prisma ?? client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;