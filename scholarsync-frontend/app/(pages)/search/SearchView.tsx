'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Rows3, Rows4, SearchX, SlidersHorizontal, Search, X } from "lucide-react";
import { useLocalSetting } from "@/app/lib/hooks/useLocalSetting";
import { SETTING_KEYS } from "@/app/lib/constants/ui.constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePaperSearch } from "@/app/api/papers";
import { FIELDS_OF_STUDY, PUBLICATION_TYPES } from "@/app/lib/constants/sources.constants";
import { activeFilters, CLEAR_FILTERS, maxPage, parseSearchParams, SearchState, toSearchParams } from "@/app/lib/utils/search";
import { CORPUS_SIZE_LABEL, SORT_OPTIONS } from "@/app/lib/constants/search.constants";
import { PAGE_SIZE } from "@/app/lib/constants/pagination.constants";
import { SearchBar } from "@/app/ui/components/SearchBar";
import { PaperCard, PaperList, ReadLink } from "@/app/ui/components/PaperCard";
import { PaperActions } from "@/app/ui/components/PaperActions";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { PaperCardSkeleton } from "@/app/ui/components/Skeletons";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";
import { pageCount } from "@/app/lib/utils/pagination";
import { SearchFilters } from "./SearchFilters";
import { ROUTES } from "@/app/lib/constants/routes.constants";

const FILTER_LABELS = Object.fromEntries([...FIELDS_OF_STUDY, ...PUBLICATION_TYPES].map(o => [o.value, o.label]));

export function SearchView() {
    const router = useRouter();
    const state = parseSearchParams(useSearchParams());
    const { data, error, isFetching, isPending, isPlaceholderData, refetch } = usePaperSearch(state);
    const [filtersOpen, setFiltersOpen] = useState(false);
    // A per-browser view preference, so it isn't part of shared search links
    const [compact, setCompact] = useLocalSetting<boolean>(SETTING_KEYS.searchCompact, false);

    const update = (patch: Partial<SearchState>) => {
        // Any filter change starts again from page 1
        const next = { ...state, page: 1, ...patch };
        router.replace(`${ROUTES.search}?${toSearchParams(next)}`, { scroll: false });
    };

    const chips = activeFilters(state, FILTER_LABELS);
    const lastPage = data ? pageCount(data.total, PAGE_SIZE, maxPage()) : 1;
    // A page past the last one (stale link, typed URL) would show "No papers match" under "Page 20 of 3"
    const beyondEnd = !!data && !isPlaceholderData && data.total > 0 && state.page > lastPage;
    const lastPageUrl = `${ROUTES.search}?${toSearchParams({ ...state, page: lastPage })}`;
    useEffect(() => {
        if (beyondEnd) router.replace(lastPageUrl, { scroll: false });
    }, [beyondEnd, router, lastPageUrl]);
    // Keyed by the year range so the slider resets when a chip clears it
    const filters = <SearchFilters key={`${state.yearFrom}-${state.yearTo}`} state={state} onChange={update} />;

    return (
        <PageContainer>
            <PageHeader title="Search" description="One query searches OpenAlex, Crossref, Europe PMC and arXiv." />
            <SearchBar key={state.q} defaultValue={state.q} />

            {!state.q ? (
                <EmptyState icon={Search} title={`Search over ${CORPUS_SIZE_LABEL} papers`} description="Try a topic, a paper title or an author's name. You can narrow results by year, field, citations and open access." />
            ) : (
                <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)]">
                    <aside className="hidden md:block">{filters}</aside>

                    <section className="flex min-w-0 flex-col gap-4" aria-busy={isFetching}>
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
                                {data ? <><span className="font-semibold text-foreground">{data.total.toLocaleString()}</span> results{isFetching && " · updating…"}</> : isPending ? "Searching…" : null}
                            </p>
                            <Button variant="outline" size="sm" className="md:hidden" onClick={() => setFiltersOpen(true)}>
                                <SlidersHorizontal /> Filters{chips.length > 0 && ` (${chips.length})`}
                            </Button>
                            <SimpleSelect aria-label="Sort results" value={state.sort} options={SORT_OPTIONS} onValueChange={sort => update({ sort })} />
                            <Button variant="ghost" size="icon-sm" aria-pressed={compact} aria-label={compact ? "Show abstracts" : "Hide abstracts (compact list)"} title={compact ? "Show abstracts" : "Compact list"} onClick={() => setCompact(!compact)}>
                                {compact ? <Rows3 /> : <Rows4 />}
                            </Button>
                        </div>

                        {chips.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                {chips.map(chip => (
                                    <Button key={chip.id} variant="secondary" size="xs" className="rounded-full" onClick={() => update(chip.remove)} aria-label={`Remove filter ${chip.label}`}>
                                        {chip.label} <X aria-hidden />
                                    </Button>
                                ))}
                                <Button variant="link" size="xs" className="text-muted-foreground" onClick={() => update(CLEAR_FILTERS)}>Clear all</Button>
                            </div>
                        )}

                        {isPending && <PaperCardSkeleton count={4} />}
                        {error && <ErrorState error={error} onRetry={() => refetch()} />}
                        {data && data.items.length === 0 && (
                            <EmptyState
                                icon={SearchX}
                                title="No papers match"
                                description={chips.length ? "Try removing some filters." : "Try different or fewer words."}
                                action={chips.length > 0 && <Button variant="outline" size="sm" onClick={() => update(CLEAR_FILTERS)}>Clear filters</Button>}
                            />
                        )}
                        {!!data?.items.length && (
                            <PaperList>
                                {data.items.map(paper => (
                                    <PaperCard key={paper.id} paper={paper} compact={compact} actions={<>{paper.hasPdf && <ReadLink paperId={paper.id} />}<PaperActions paperId={paper.id} /></>} />
                                ))}
                            </PaperList>
                        )}

                        {data && lastPage > 1 && (
                            <nav className="flex items-center justify-between gap-4 py-2" aria-label="Pagination">
                                <Button variant="outline" size="sm" disabled={state.page <= 1} onClick={() => update({ page: state.page - 1 })}>
                                    <ChevronLeft /> Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">Page {state.page} of {lastPage}</span>
                                <Button variant="outline" size="sm" disabled={state.page >= lastPage} onClick={() => update({ page: state.page + 1 })}>
                                    Next <ChevronRight />
                                </Button>
                            </nav>
                        )}
                    </section>
                </div>
            )}

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                    <div className="px-4 pb-6">{filters}</div>
                </SheetContent>
            </Sheet>
        </PageContainer>
    );
}
