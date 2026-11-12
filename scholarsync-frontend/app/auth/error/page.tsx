import Link from "next/link";
import { Wordmark } from "@/app/ui/components/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import { getGoogleAuthUrl } from "@/app/api/auth";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
    const { reason } = await searchParams;
    // Google sends access_denied when the user cancels. Other reasons are backend exception text: not shown,
    // since it can leak internals and the query param is attacker-controlled.
    const cancelled = reason?.includes("access_denied");

    return (
        <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
            <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border bg-card p-8 text-center">
                <Wordmark />
                <div className="flex flex-col gap-2">
                    <h1 className="text-xl font-semibold">We couldn’t sign you in</h1>
                    <p className="text-sm text-muted-foreground">
                        {cancelled ? "Google sign-in was cancelled. Try again whenever you're ready." : "Something went wrong while signing you in with Google."}
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                    <a href={getGoogleAuthUrl()} className={buttonVariants()}>Try signing in again</a>
                    <Link href={ROUTES.home} className={buttonVariants({ variant: "outline" })}>Back home</Link>
                </div>
            </div>
        </main>
    );
}
