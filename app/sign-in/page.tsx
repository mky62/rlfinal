// app/login/page.tsx
import { authClient } from "@/app/lib/auth-client";
import { SignInButton } from "@/app/components/SignInButton";

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950">
            <div className="flex flex-col items-center gap-6 p-8 border border-zinc-800 rounded-xl w-80 bg-zinc-900">
                <h1 className="text-xl font-semibold text-white">Sign in</h1>
                <SignInButton />
            </div>
        </main>
    );
}