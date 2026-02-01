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
import { UI_TEXT } from '@/constants/appText';

export function SearchResultsContent({ initialResults, query, isLoading = false }: { initialResults?: Paper[], query?: string, isLoading?: boolean }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryParam = searchParams.get('q') || '';

    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    // Track whether we're still waiting for initial results from the server
    const [initialLoad, setInitialLoad] = useState<boolean>(isLoading || !initialResults || initialResults.length === 0);

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
        handleRenameReadList,
        handleUpdateReadListColor,
        handleDeleteReadList,
        handleAddToReadList,
        handleRemoveFromReadList,
        isHydrated
    } = useReadLists();

    const isSyncing = queryParam && queryParam !== activeQuery;

    useEffect(() => {
        if (!queryParam) {
            setInitialLoad(false);
            return;
        }

        if (!searchState.isLoading && !isSyncing) {
            setInitialLoad(false);
        }
    }, [queryParam, searchState.isLoading, isSyncing]);

    useEffect(() => {
        if (isSyncing && isHydrated && searchState.query !== '') {
            handleSearch(queryParam);
            
            const listToRename = readLists.find(l => l.id === activeReadListId) || readLists.find(l => l.id === 'default');
            
            if (listToRename && (listToRename.name === UI_TEXT.UNTITLED_READ_LIST || listToRename.name === UI_TEXT.UNTITLED_LIST || listToRename.name === UI_TEXT.UNTITLED_READING_LIST)) {
                handleRenameReadList(listToRename.id, queryParam);
            } else {
                handleCreateReadList(queryParam);
            }
        }
    }, [queryParam, activeQuery, handleSearch, handleCreateReadList, handleRenameReadList, isSyncing, activeReadListId, readLists, isHydrated, searchState.query]);

    const showSkeletons = (searchState.isLoading && searchState.results.length === 0) || isSyncing || initialLoad;
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
            const listToRename = readLists.find(l => l.id === activeReadListId) || readLists.find(l => l.id === 'default');
            
            if (listToRename && (listToRename.name === UI_TEXT.UNTITLED_READ_LIST || listToRename.name === UI_TEXT.UNTITLED_LIST || listToRename.name === UI_TEXT.UNTITLED_READING_LIST)) {
                handleRenameReadList(listToRename.id, trimmedQuery);
            } else {
                handleCreateReadList(trimmedQuery);
            }
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        }
    };

    const handleStartNewReadList = () => {
        handleCreateReadList(UI_TEXT.UNTITLED_READ_LIST);
        clearSearch();
        router.push('/');
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    };

    const activeList = readLists.find(l => l.id === activeReadListId) || readLists[0];

    return (
        <MainLayout
            readLists={readLists}
            activeReadListId={activeReadListId}
            setActiveReadListId={(id) => {
                setActiveReadListId(id);
                if (id) router.push('/');
            }}
            handleCreateReadList={handleCreateReadList}
            handleDeleteReadList={handleDeleteReadList}
            handleRenameReadList={handleRenameReadList}
            handleUpdateReadListColor={handleUpdateReadListColor}
            savedPapers={savedPapers}
            handleRemoveFromReadList={handleRemoveFromReadList}
            onFindRelatedAction={(p: Paper) => router.push(`/related-papers?paperId=${p.id}`)}
            onViewPaper={(p: Paper) => router.push(`/paper/${p.id}`)}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
            showMobileMenuButton={hasResults || showSkeletons || !!searchState.error}
            scrollRef={mainScrollRef}
            onStartNewReadList={handleStartNewReadList}
        >
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 mr-4 cursor-pointer" onClick={() => router.push('/')}>
                        <GraduationCap className="text-scholar-600" size={24} />
                        <span className="font-bold text-slate-800">{UI_TEXT.APP_NAME}</span>
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
                                {UI_TEXT.RESULTS_FOR(activeQuery)}
                            </h3>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {searchState.results.map((paper, index) => (
                                <PaperCard
                                    key={`${paper.id}-${index}`}
                                    paper={paper}
                                    onAddToReadListAction={handleAddToReadList}
                                    onRemoveFromReadList={(p) => activeReadListId && handleRemoveFromReadList(activeReadListId, p.id)}
                                    onFindRelatedAction={(p) => router.push(`/related-papers?paperId=${p.id}`)}
                                    isSaved={!!savedPapers[paper.id] && !!activeList?.paperIds.includes(paper.id)}
                                    activeReadListName={activeList?.name}
                                    readLists={readLists}
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
                                <p className="text-slate-400 text-sm text-center">{UI_TEXT.NO_MORE_RELATED}</p>
                            )}
                        </div>
                    </div>
                )}

                {!showSkeletons && !hasResults && !searchState.error && !initialLoad && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-slate-500 text-lg text-center">{UI_TEXT.NO_RESULTS_FOUND(queryParam)}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 text-scholar-600 font-medium hover:underline"
                        >
                            {UI_TEXT.BACK_TO_HOME}
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
