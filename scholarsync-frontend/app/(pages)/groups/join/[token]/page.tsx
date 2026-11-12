'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useJoinGroup } from "@/app/api/groups";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function JoinGroupPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();
    const join = useJoinGroup();
    const started = useRef(false);

    useEffect(() => {
        // StrictMode runs effects twice in dev; the join is idempotent but one request is enough
        if (started.current) return;
        started.current = true;
        join.mutate(token, {
            onSuccess: group => { toast.success(`Welcome to ${group.name}`); router.replace(ROUTES.group(group.id)); },
        });
    }, [join, router, token]);

    return (
        <PageContainer className="max-w-xl">
            {join.error ? (
                <>
                    <h1 className="text-2xl font-semibold tracking-tight">This invite didn&apos;t work</h1>
                    <ErrorState error={join.error} />
                    <Link href={ROUTES.groups} className={buttonVariants({ variant: "outline", className: "self-start" })}>Back to groups</Link>
                </>
            ) : (
                <div className="flex flex-col gap-2" role="status">
                    <h1 className="text-2xl font-semibold tracking-tight">Joining the reading group</h1>
                    <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Checking your invite link…</p>
                </div>
            )}
        </PageContainer>
    );
}
