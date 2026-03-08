// middleware.ts  (root of project)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

const PROTECTED = ["/dashboard", "/settings", "/profile"];
const GUEST_ONLY = ["/login"];

export async function middleware(req: NextRequest) {
    const session = await auth.api.getSession({ headers: req.headers });
    const { pathname } = req.nextUrl;

    if (!session && PROTECTED.some(p => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if (session && GUEST_ONLY.includes(pathname)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};