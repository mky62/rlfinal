import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    const path = req.nextUrl.pathname.split("/").pop(); // last part of the URL
    if (!path) return NextResponse.json({ error: "Invalid route" }, { status: 400 });

    if (path === "github") {
        // Start GitHub OAuth
        const clientId = process.env.GITHUB_CLIENT_ID;
        const redirectUri = process.env.GITHUB_REDIRECT_URI;
        const scope = "read:user user:email";
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        return NextResponse.redirect(githubUrl);
    }

    if (path === "callback") {
        const code = req.nextUrl.searchParams.get("code");
        if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

        // Exchange code for token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { Accept: "application/json" },
            body: new URLSearchParams({
                client_id: process.env.GITHUB_CLIENT_ID!,
                client_secret: process.env.GITHUB_CLIENT_SECRET!,
                code,
            }),
        });

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) return NextResponse.json({ error: "Failed to get access token" }, { status: 400 });

        // Fetch GitHub user
        const userRes = await fetch("https://api.github.com/user", {
            headers: { Authorization: `token ${accessToken}` },
        });
        const githubUser = await userRes.json();

        const emailRes = await fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `token ${accessToken}` },
        });
        const emails = await emailRes.json();
        const primaryEmail = emails.find((e: any) => e.primary)?.email;

        // Find or create user
        let user = await prisma.user.findUnique({ where: { githubId: githubUser.id.toString() } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    githubId: githubUser.id.toString(),
                    username: githubUser.login,
                    stageName: githubUser.login,
                    name: githubUser.name,
                    email: primaryEmail,
                    avatarUrl: githubUser.avatar_url,
                    accounts: { create: { provider: "github", providerAccountId: githubUser.id.toString(), accessToken } },
                },
            });
        } else {
            await prisma.account.upsert({
                where: {
                    provider_providerAccountId: { provider: "github", providerAccountId: githubUser.id.toString() },
                },
                update: { accessToken },
                create: { userId: user.id, provider: "github", providerAccountId: githubUser.id.toString(), accessToken },
            });
        }

        // Create session
        const sessionToken = crypto.randomUUID();
        await prisma.session.create({
            data: { userId: user.id, sessionToken, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });

        const response = NextResponse.redirect(new URL("/dashboard", req.url));
        response.cookies.set("session", sessionToken, { httpOnly: true, path: "/", maxAge: 7 * 24 * 60 * 60 });
        return response;
    }

    return NextResponse.json({ error: "Route not found" }, { status: 404 });
}