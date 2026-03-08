import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();
let _pendingProfile: Record<string, any> | null = null;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,

      getUserInfo: async (token) => {
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        const profile = await res.json();

        return {
          user: {
            id: String(profile.id),
            name: profile.name ?? profile.login,
            email: profile.email ?? undefined,
            image: profile.avatar_url,
            emailVerified: false,          // ← required by BA's type
          },
          data: profile,
        };
      },
    },
  },

  user: {
    modelName: "User",
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      stageName: { type: "string", required: false },
      username: { type: "string", required: false },
      githubId: { type: "string", required: false },
    },
  },

  account: {
    modelName: "Account",
    fields: {
      accountId: "providerAccountId",
      providerId: "provider",
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const profile = _pendingProfile;
          _pendingProfile = null; // clear after use

          return {
            data: {
              ...user,
              username: profile?.login ?? undefined,
              stageName: profile?.login ?? undefined,
              githubId: profile?.id ? String(profile.id) : undefined,
            },
          };
        },
      },
    },
  },

  session: {
    modelName: "Session",
    fields: {
      token: "sessionToken",
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});