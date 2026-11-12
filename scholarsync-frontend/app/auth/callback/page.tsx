'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { QUERY_KEYS } from "@/app/lib/constants/query-keys.constants";
import { RETURN_TO_COOKIE } from "@/app/lib/constants/auth.constants";
import { AUTH_CALLBACK_TIMEOUT_MS } from "@/app/lib/constants/timing.constants";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { readCookie, safeReturnPath } from "@/app/lib/utils/routes";
import { Mark } from "@/app/ui/components/Wordmark";

export default function AuthCallbackPage() {
    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        const saved = readCookie(document.cookie, RETURN_TO_COOKIE);
        document.cookie = `${RETURN_TO_COOKIE}=; path=/; max-age=0`;
        let done = false;
        // A backend that never answers would leave "Signing you in" up forever
        const timeout = setTimeout(() => { if (!done) router.replace(ROUTES.authError); }, AUTH_CALLBACK_TIMEOUT_MS);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.me })
            .then(() => { done = true; router.replace(safeReturnPath(saved)); })
            .catch(() => { done = true; router.replace(ROUTES.authError); })
            .finally(() => clearTimeout(timeout));
        return () => clearTimeout(timeout);
    }, [queryClient, router]);

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface p-4" role="status">
            <Mark className="size-8" />
            <h1 className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Signing you in…</h1>
        </main>
    );
}
