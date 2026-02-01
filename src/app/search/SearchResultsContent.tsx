'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useReadLists } from '@/hooks/useReadLists';
import { PaperCard } from '@/components/PaperCard';
import { PaperCardSkeleton } from '@/components/Skeleton';
import { SearchBar } from '@/components/SearchBar';
import { MainLayout } from '@/components/MainLayout';
import { Paper } from '@/types';

export function SearchResultsContent({ initialResults, query }: { initialResults?: Paper[], query?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryParam = searchParams.get('q') || '';

    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const {
        searchState,
        setSearchState,
        activeQuery,
        handleSearch,
        handleLoadMore,
        hasMore,
        clearSearch
    } = useSearch(initialResults, query);

    const {
        readLists,
        savedPapers,
        activeReadListId,
        setActiveReadListId,
        handleCreateReadList,
        handleDeleteReadList,
        handleAddToReadList,
        handleRemoveFromReadList
    } = useReadLists();

    const isSyncing = queryParam && queryParam !== activeQuery;

    useEffect(() => {
        if (isSyncing) {
            handleSearch(queryParam);
            handleCreateReadList(queryParam);
        }
    }, [queryParam, activeQuery, handleSearch, handleCreateReadList, isSyncing]);

    const showSkeletons = (searchState.isLoading && searchState.results.length === 0) || isSyncing;
    const hasResults = searchState.results.length > 0;

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    handleLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [handleLoadMore]);

    const handleNewSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmedQuery = searchState.query.trim();
        if (trimmedQuery) {
            handleCreateReadList(trimmedQuery);
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        }
    };

    const handleStartNewReadlist = () => {
        setActiveReadListId(null);
        clearSearch();
        router.push('/');
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    };

    const activeList = readLists.find(l => l.id === activeReadListId) || readLists[0];

    return (
        <MainLayout
            readLists={readLists}
            activeReadListId={activeReadListId}
            setActiveReadListId={setActiveReadListId}
            handleCreateReadList={handleCreateReadList}
            handleDeleteReadList={handleDeleteReadList}
            savedPapers={savedPapers}
            handleRemoveFromReadList={handleRemoveFromReadList}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
            showMobileMenuButton={hasResults || showSkeletons || !!searchState.error}
            scrollRef={mainScrollRef}
            onStartNewReadList={handleStartNewReadlist}
        >
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 mr-4 cursor-pointer" onClick={() => router.push('/')}>
                        <GraduationCap className="text-scholar-600" size={24} />
                        <span className="font-bold text-slate-800">ScholarSync</span>
                    </div>
                    <SearchBar
                        query={searchState.query}
                        onChange={(val) => setSearchState(prev => ({ ...prev, query: val }))}
                        onSearch={handleNewSearch}
                        isLoading={searchState.isLoading}
                        isSticky={true}
                        isPagination={searchState.results.length > 0}
                    />
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                {showSkeletons && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <PaperCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {searchState.error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center mb-6">
                        {searchState.error}
                    </div>
                )}

                {hasResults && (
                    <div className="animate-fadeIn space-y-6">
                        {!showSkeletons && (
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                Results for "{activeQuery}"
                            </h3>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {searchState.results.map((paper, index) => (
                                <PaperCard
                                    key={`${paper.id}-${index}`}
                                    paper={paper}
                                    onAddToReadlist={handleAddToReadList}
                                    onRemoveFromReadlist={(p) => activeReadListId && handleRemoveFromReadList(activeReadListId, p.id)}
                                    onFindRelated={(p) => router.push(`/related-papers?paperId=${p.id}`)}
                                    isSaved={!!savedPapers[paper.id] && !!activeList?.paperIds.includes(paper.id)}
                                    activeReadlistName={activeList?.name}
                                    readlists={readLists}
                                />
                            ))}
                        </div>

                        <div ref={observerTarget} className="py-8">
                            {searchState.isLoading && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {[...Array(3)].map((_, i) => (
                                        <PaperCardSkeleton key={i} />
                                    ))}
                                </div>
                            )}
                            {!searchState.isLoading && !hasMore && hasResults && (
                                <p className="text-slate-400 text-sm text-center">No more related papers found.</p>
                            )}
                        </div>
                    </div>
                )}

                {!showSkeletons && !hasResults && !searchState.error && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-slate-500 text-lg text-center">No results found for "{queryParam}"</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 text-scholar-600 font-medium hover:underline"
                        >
                            Back to Home
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
