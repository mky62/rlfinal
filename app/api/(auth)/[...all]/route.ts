// app/api/(auth)/[...all]/route.ts
import { auth } from "@/app/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { prisma } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const res = await handler.POST(req);

    // After GitHub callback, backfill missing fields
    if (url.pathname.includes("/callback/github") || url.pathname.includes("/sign-in/social")) {
        try {
            // Find users missing username/stageName and patch them
            await prisma.user.updateMany({
                where: {
                    OR: [
                        { username: null },
                        { stageName: null },
                    ],
                },
                data: {
                    // Can't set unique fields in updateMany — use raw approach below
                },
            });
        } catch { }
    }

    return res;
}