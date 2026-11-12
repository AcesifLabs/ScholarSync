'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthor, useAuthorPapers } from "@/app/api/authors";
import { PaperCard, PaperList, ReadLink } from "@/app/ui/components/PaperCard";
import { Avatar } from "@/app/ui/components/Avatar";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { PaperActions } from "@/app/ui/components/PaperActions";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { PaperCardSkeleton } from "@/app/ui/components/Skeletons";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function ResearcherPage() {
    const { id } = useParams<{ id: string }>();
    const author = useAuthor(id);
    const papers = useAuthorPapers(id);
    useDocumentTitle(author.data?.name);
    const back = <Link href={ROUTES.researchers} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Researchers</Link>;

    if (author.isPending) return <PageContainer>{back}<Skeleton className="h-16 w-1/2" /><Skeleton className="h-24 w-full" /></PageContainer>;
    if (author.error || !author.data) return <PageContainer>{back}<ErrorState error={author.error} onRetry={() => author.refetch()} /></PageContainer>;

    const a = author.data;
    const stats = [
        { label: "Papers", value: a.paperCount },
        { label: "Citations", value: a.citationCount },
        { label: "h-index", value: a.hIndex },
    ];
    const items = papers.data?.pages.flatMap(p => p.items) ?? [];

    return (
        <PageContainer>
            {back}
            <header className="flex flex-wrap items-center gap-4">
                <Avatar name={a.name} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-balance">{a.name}</h1>
                    {a.affiliations.length > 0 && <p className="text-muted-foreground">{a.affiliations.join(" · ")}</p>}
                    <div className="flex flex-wrap gap-4 text-sm">
                        {a.homepage && <a href={a.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3.5" /> ORCID</a>}
                        {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3.5" /> OpenAlex</a>}
                    </div>
                </div>
            </header>

            <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y py-3">
                {stats.map(s => (
                    <div key={s.label} className="flex items-baseline gap-2">
                        <dt className="text-sm text-muted-foreground">{s.label}</dt>
                        <dd className="text-lg font-semibold">{s.value.toLocaleString()}</dd>
                    </div>
                ))}
            </dl>

            <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">Papers</h2>
                {papers.isPending && <PaperCardSkeleton count={3} />}
                {papers.error && <ErrorState error={papers.error} onRetry={() => papers.refetch()} />}
                {papers.isSuccess && items.length === 0 && <EmptyState compact icon={FileText} title="No papers listed" />}
                {items.length > 0 && (
                    <PaperList origin={`researcher:${id}`}>
                        {items.map(paper => <PaperCard key={paper.id} paper={paper} actions={<>{paper.hasPdf && <ReadLink paperId={paper.id} />}<PaperActions paperId={paper.id} /></>} />)}
                    </PaperList>
                )}
                {papers.hasNextPage && (
                    <Button variant="outline" className="self-start" disabled={papers.isFetchingNextPage} onClick={() => papers.fetchNextPage()}>
                        {papers.isFetchingNextPage ? "Loading…" : "Load more papers"}
                    </Button>
                )}
            </section>
        </PageContainer>
    );
}
