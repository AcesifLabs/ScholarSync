import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { useReadlists } from '../hooks/useReadlists';

import { PaperCard } from '../components/PaperCard';
import { PaperCardSkeleton } from '../components/Skeleton';
import { SearchBar } from '../components/SearchBar';
import { MainLayout } from '../components/MainLayout';

export default function SearchResults() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
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
    } = useSearch();

    const {
        readlists,
        savedPapers,
        activeReadlistId,
        setActiveReadlistId,
        handleCreateReadlist,
        handleDeleteReadlist,
        handleAddToReadlist,
        handleRemoveFromReadlist
    } = useReadlists();

    const hasResults = searchState.results.length > 0;
    const isInitialLoading = searchState.isLoading && searchState.results.length === 0;

    // Trigger search when query param changes
    useEffect(() => {
        if (queryParam && queryParam !== activeQuery) {
            handleSearch(queryParam);
            handleCreateReadlist(queryParam);
        }
    }, [queryParam, activeQuery, handleSearch, handleCreateReadlist]);

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
            handleCreateReadlist(trimmedQuery);
            setSearchParams({ q: trimmedQuery });
        }
    };

    const handleStartNewReadlist = () => {
        setActiveReadlistId(null);
        clearSearch();
        navigate('/');
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    };

    const activeList = readlists.find(l => l.id === activeReadlistId) || readlists[0];

    return (
        <MainLayout
            readlists={readlists}
            activeReadlistId={activeReadlistId}
            setActiveReadlistId={setActiveReadlistId}
            handleCreateReadlist={handleCreateReadlist}
            handleDeleteReadlist={handleDeleteReadlist}
            savedPapers={savedPapers}
            handleRemoveFromReadlist={handleRemoveFromReadlist}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
            showMobileMenuButton={hasResults || isInitialLoading || !!searchState.error}
            scrollRef={mainScrollRef}
            onStartNewReadlist={handleStartNewReadlist}
        >
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 mr-4 cursor-pointer" onClick={() => navigate('/')}>
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
                {isInitialLoading && (
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
                        {!isInitialLoading && (
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                Results for "{activeQuery}"
                            </h3>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {searchState.results.map((paper, index) => (
                                <PaperCard
                                    key={`${paper.id}-${index}`}
                                    paper={paper}
                                    onAddToReadlist={handleAddToReadlist}
                                    onRemoveFromReadlist={(p) => activeReadlistId && handleRemoveFromReadlist(activeReadlistId, p.id)}
                                    onFindRelated={(p) => navigate(`/related-papers?paperId=${p.id}`)}
                                    isSaved={!!savedPapers[paper.id] && !!activeList?.paperIds.includes(paper.id)}
                                    activeReadlistName={activeList?.name}
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

                {!isInitialLoading && !hasResults && !searchState.error && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-slate-500 text-lg text-center">No results found for "{queryParam}"</p>
                        <button
                            onClick={() => navigate('/')}
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
