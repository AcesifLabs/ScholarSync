'use client';

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import type { Schemas } from "@/app/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyGroups } from "@/app/api/groups";
import { atLeast } from "@/app/lib/utils/groups";

// pdf.js needs browser APIs (DOMMatrix, workers), so the reader never renders on the server
const Reader = dynamic(() => import("./Reader").then(m => m.Reader), {
    ssr: false,
    loading: () => (
        <div className="flex h-full flex-col" role="status" aria-label="Loading reader">
            <div className="h-11 border-b bg-surface" />
            <div className="flex-1 bg-muted p-6"><Skeleton className="mx-auto h-[70vh] max-w-3xl bg-background" /></div>
        </div>
    ),
});

// Viewers can read group annotations but not add them
const visibilityOptions = (groups: Schemas['GroupSummary'][]) =>
    groups.filter(g => atLeast(g.myRole, "MEMBER")).map(g => ({ value: g.id, label: g.name }));

export default function ReadPage() {
    const { id } = useParams<{ id: string }>();
    const { data: options } = useMyGroups(visibilityOptions);
    return <Suspense><Reader paperId={decodeURIComponent(id)} visibilityOptions={options} /></Suspense>;
}
