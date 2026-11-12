'use client';

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, GraduationCap, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthorSearch } from "@/app/api/authors";
import { Avatar } from "@/app/ui/components/Avatar";
import { SearchField } from "@/app/ui/components/SearchField";
import { MAX_RESULTS } from "@/app/lib/constants/search.constants";
import { PAGE_SIZE } from "@/app/lib/constants/pagination.constants";
import { AUTHOR_QUERY_MAX } from "@/app/lib/constants/limits.constants";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { pageCount, parsePageParam } from "@/app/lib/utils/pagination";
import { ROUTES } from "@/app/lib/constants/routes.constants";

const MAX_PAGES = pageCount(MAX_RESULTS, PAGE_SIZE);

/** Keyed by the URL query, so the field follows back/forward navigation instead of keeping a stale draft. */
function AuthorSearchForm({ initial, onSearch }: { initial: string; onSearch: (query: string) => void }) {
    const [draft, setDraft] = useState(initial);
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (draft.trim()) onSearch(draft.trim());
    };
    return (
        <SearchField onSubmit={submit}>
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Search by author name" aria-label="Author name" maxLength={AUTHOR_QUERY_MAX}
                className="h-full flex-1 border-0 bg-transparent shadow-none focus-visible:outline-none dark:bg-transparent" />
            <Button type="submit" className="mr-1 shrink-0 px-4" disabled={!draft.trim()}>Search</Button>
        </SearchField>
    );
}

export function ResearchersView() {
    const router = useRouter();
    const params = useSearchParams();
    const q = params.get("q")?.trim() ?? "";
    // Zero-based in the URL; fractional or out-of-window values are clamped instead of sent as offsets
    const page = parsePageParam(params.get("page"), 0, MAX_PAGES - 1);
    const { data, error, isFetching, isPending, isPlaceholderData, refetch } = useAuthorSearch(q, page * PAGE_SIZE, PAGE_SIZE);
    const lastPage = data ? pageCount(data.total, PAGE_SIZE, MAX_PAGES) - 1 : 0;

    const go = (query: string, nextPage = 0) => router.replace(ROUTES.researcherSearch(query, nextPage));

    // A page past the end of the results (stale link, typed URL) moves to the last page that has any
    const beyondEnd = !!data && !isPlaceholderData && data.total > 0 && page > lastPage;
    useEffect(() => {
        if (beyondEnd) router.replace(ROUTES.researcherSearch(q, lastPage));
    }, [beyondEnd, router, q, lastPage]);

    return (
        <PageContainer>
            <PageHeader title="Researchers" description="Find an author to see their papers, citations and h-index." />
            <AuthorSearchForm key={q} initial={q} onSearch={go} />

            {!q && <EmptyState icon={GraduationCap} title="Search for a researcher" description="Try a full name, e.g. “Yoshua Bengio”." />}
            {q && isPending && <ListSkeleton rows={5} />}
            {error && <ErrorState error={error} onRetry={() => refetch()} />}
            {q && data?.items.length === 0 && <EmptyState icon={UserX} title="No researchers found" description="Check the spelling or try fewer words." />}

            {!!data?.items.length && (
                <ul className="flex flex-col divide-y *:enter border-y" aria-busy={isFetching}>
                    {data.items.map(author => (
                        <li key={author.id}>
                            <Link href={ROUTES.researcher(author.id)} className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-2 py-3 transition-colors hover:bg-accent/60 focus-visible:-outline-offset-2">
                                <Avatar name={author.name} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">{author.name}</p>
                                    {author.affiliations.length > 0 && <p className="truncate text-sm text-muted-foreground">{author.affiliations.join(" · ")}</p>}
                                </div>
                                <dl className="flex shrink-0 gap-6 pl-12 text-sm sm:pl-0 sm:text-right">
                                    <div><dt className="text-xs text-muted-foreground">Papers</dt><dd className="font-semibold">{author.paperCount.toLocaleString()}</dd></div>
                                    <div><dt className="text-xs text-muted-foreground">Citations</dt><dd className="font-semibold">{author.citationCount.toLocaleString()}</dd></div>
                                    <div><dt className="text-xs text-muted-foreground">h-index</dt><dd className="font-semibold">{author.hIndex}</dd></div>
                                </dl>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {lastPage > 0 && (
                <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => go(q, page - 1)}><ChevronLeft /> Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page + 1} of {lastPage + 1}</span>
                    <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => go(q, page + 1)}>Next <ChevronRight /></Button>
                </nav>
            )}
        </PageContainer>
    );
}
