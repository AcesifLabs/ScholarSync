'use client';

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollections, useUpdateCollection } from "@/app/api/collections";
import { useLibrary, useUpdateLibraryItem } from "@/app/api/library";
import { timeAgo } from "@/app/lib/utils/notifications";
import { PaperCard, PaperList } from "@/app/ui/components/PaperCard";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { toastError } from "@/app/lib/utils/toast";
import { PAGE_SIZE } from "@/app/lib/constants/pagination.constants";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { pageCount } from "@/app/lib/utils/pagination";

type Tab = "collections" | "papers";

export default function ArchivePage() {
    return <Suspense><ArchiveView /></Suspense>;
}

function ArchiveView() {
    const router = useRouter();
    // The tab lives in the URL so going back to the archive returns to the same list
    const tab: Tab = useSearchParams().get("tab") === "papers" ? "papers" : "collections";
    const setTab = (next: Tab) => router.replace(next === "papers" ? `${ROUTES.archive}?tab=papers` : ROUTES.archive, { scroll: false });
    const collections = useCollections(true);
    const [page, setPage] = useState(0);
    const papers = useLibrary({ archived: true, sort: "updated", page, size: PAGE_SIZE }, tab === "papers");
    const lastPage = papers.data ? pageCount(papers.data.total, PAGE_SIZE) - 1 : 0;
    const unarchiveCollection = useUpdateCollection();
    const unarchivePaper = useUpdateLibraryItem();
    const active = tab === "collections" ? collections : papers;
    const restored = () => toast("Restored from archive");

    return (
        <PageContainer>
            <PageHeader title="Archive" description="Collections and papers you've put away. Nothing here is deleted." />
            <Tabs value={tab} onValueChange={value => setTab(value as Tab)}>
                <TabsList variant="line">
                    <TabsTrigger value="collections">Collections</TabsTrigger>
                    <TabsTrigger value="papers">Papers</TabsTrigger>
                </TabsList>
            </Tabs>

            {active.isPending && <ListSkeleton rows={3} />}
            {active.error && <ErrorState error={active.error} onRetry={() => active.refetch()} />}

            {tab === "collections" && collections.data && (collections.data.length === 0
                ? <EmptyState icon={Archive} title="No archived collections" description="Archive a collection from its menu to tidy your list." />
                : (
                    <ul className="flex flex-col divide-y *:enter border-y">
                        {collections.data.map(c => (
                            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                <div>
                                    <Link href={ROUTES.collection(c.id)} className="font-semibold hover:text-primary hover:underline">{c.name}</Link>
                                    <p className="text-xs text-muted-foreground">{c.paperCount} papers · archived {timeAgo(c.updatedAt)}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => unarchiveCollection.mutate({ id: c.id, archived: false }, { onSuccess: restored, onError: toastError })}>
                                    <ArchiveRestore /> Restore
                                </Button>
                            </li>
                        ))}
                    </ul>
                ))}

            {tab === "papers" && papers.data && (papers.data.items.length === 0
                ? <EmptyState icon={Archive} title="No archived papers" description="Archive papers from your library when you're done with them." />
                : (
                    <div className="flex flex-col gap-4">
                        <PaperList origin={"archive"}>
                        {papers.data.items.map(item => (
                            <PaperCard
                                key={item.paper.id}
                                paper={item.paper}
                                actions={
                                    <Button variant="outline" size="sm" onClick={() => unarchivePaper.mutate({ paperId: item.paper.id, archived: false }, {
                                        // Step back when the only paper on a later page is restored
                                        onSuccess: () => { if (papers.data?.items.length === 1 && page > 0) setPage(p => p - 1); restored(); },
                                        onError: toastError,
                                    })}>
                                        <ArchiveRestore /> Restore
                                    </Button>
                                }
                            />
                        ))}
                        </PaperList>
                        {lastPage > 0 && (
                            <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
                                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft /> Previous</Button>
                                <span className="text-sm text-muted-foreground">Page {page + 1} of {lastPage + 1}</span>
                                <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Next <ChevronRight /></Button>
                            </nav>
                        )}
                    </div>
                ))}
        </PageContainer>
    );
}
