'use client';

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGroupAnnotations } from "@/app/api/groups";
import type { Schemas } from "@/app/api/client";
import { colorCss, colorLabel } from "@/app/lib/constants/annotation.constants";
import { GROUP_ANNOTATIONS_PAGE_SIZE } from "@/app/lib/constants/pagination.constants";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { pageCount } from "@/app/lib/utils/pagination";
import { timeAgo } from "@/app/lib/utils/notifications";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";

type Item = Schemas['GroupAnnotation'];

/** The group's annotations across every paper, grouped under the paper they are on. */
export function AnnotationsTab({ groupId }: { groupId: string }) {
    const [page, setPage] = useState(0);
    const { data, error, isPending, refetch } = useGroupAnnotations(groupId, page);

    if (isPending) return <ListSkeleton rows={4} />;
    if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
    if (data.items.length === 0) {
        return <EmptyState icon={Highlighter} title="No group annotations yet" description="When members highlight a paper in the reader and share the highlight with this group, it appears here." />;
    }

    const byPaper = new Map<string, Item[]>();
    for (const item of data.items) {
        const list = byPaper.get(item.annotation.paperId);
        if (list) list.push(item); else byPaper.set(item.annotation.paperId, [item]);
    }
    const lastPage = pageCount(data.total, GROUP_ANNOTATIONS_PAGE_SIZE) - 1;

    return (
        <section className="flex flex-col gap-6">
            {[...byPaper].map(([paperId, items]) => (
                <div key={paperId} className="flex flex-col gap-2">
                    <h3 className="font-semibold"><Link href={ROUTES.paper(paperId)} className="hover:text-primary hover:underline">{items[0].paperTitle ?? "Untitled paper"}</Link></h3>
                    <ul className="flex flex-col divide-y *:enter border-y">
                        {items.map(({ annotation: a }) => (
                            <li key={a.id}>
                                <Link href={ROUTES.paperRead(paperId, { annotation: a.id })} className="-mx-2 flex flex-col gap-1.5 rounded-md px-2 py-3 transition-colors hover:bg-accent/60">
                                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                            <span className="size-2.5 rounded-full" style={{ background: colorCss(a.color) }} aria-hidden />{colorLabel(a.color)}
                                        </span>
                                        <span>{a.author.name} · {timeAgo(a.createdAt)}</span>
                                        {a.resolved && <span>· Resolved</span>}
                                        {a.replies.length > 0 && <span>· {a.replies.length} {a.replies.length === 1 ? "reply" : "replies"}</span>}
                                    </span>
                                    <q className="reading line-clamp-2 text-[0.9375rem] text-foreground/80">{a.quote}</q>
                                    {a.comment && <span className="line-clamp-2 text-sm">{a.comment}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            {lastPage > 0 && (
                <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft /> Newer</Button>
                    <span className="text-sm text-muted-foreground">Page {page + 1} of {lastPage + 1}</span>
                    <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Older <ChevronRight /></Button>
                </nav>
            )}
        </section>
    );
}
