// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

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
            email: profile.email ?? `${profile.login}@github.noemail`,  // ← email can't be null
            image: profile.avatar_url,
            emailVerified: false,
          },
          data: {
            ...profile,
            // Pass these through data so hooks can read them
            _username: profile.login,
            _stageName: profile.login,
            _githubId: String(profile.id),
          },
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

  session: {
    modelName: "Session",
    fields: {
      token: "sessionToken",
      expiresAt: "expires",
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});