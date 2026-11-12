'use client';

import React from "react";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/app/api/auth";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { isProtectedPath } from "@/app/lib/utils/routes";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { GoogleMark } from "@/app/ui/components/icons/GoogleMark";

/**
 * On private pages, replaces the page with a sign-in prompt when there is no valid session. The proxy only redirects
 * when the auth cookie is missing; an expired cookie gets here, and the page's user-gated queries would never start.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, error, retry } = useAuth();

    // While the session loads, the page shows its own skeletons
    if (!isProtectedPath(pathname) || user || (user === undefined && !error)) return children;

    if (error) {
        return <PageContainer><ErrorState error={error} onRetry={retry} /></PageContainer>;
    }

    return (
        <PageContainer className="max-w-xl">
            <EmptyState
                icon={LogIn}
                title="Sign in to continue"
                description="Your session has ended. Sign in again and you'll come straight back here."
                action={<Button onClick={() => signIn(window.location.pathname + window.location.search)}><GoogleMark className="size-4" /> Sign in with Google</Button>}
            />
        </PageContainer>
    );
}
