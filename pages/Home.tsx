import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { useReadlists } from '../hooks/useReadlists';

// Components
import { PaperCard } from '../components/PaperCard';
import { Spinner } from '../components/Spinner';
import { SearchBar } from '../components/SearchBar';
import { SearchingState } from '../components/SearchingState';
import { ReadlistDetail } from '../components/ReadlistDetail';
import { MainLayout } from '../components/MainLayout';

export default function Home() {
    const navigate = useNavigate();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const {
        searchState,
        setSearchState,
        activeQuery,
        handleSearch,
        handleLoadMore,
        hasMore
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

    const activeList = readlists.find(r => r.id === activeReadlistId);
    const hasResults = searchState.results.length > 0;
    const isInitialLoading = searchState.isLoading && searchState.results.length === 0;

    // Infinite Scroll Observer
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

    // Scroll Restoration Logic
    useEffect(() => {
        const container = mainScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (!activeReadlistId) { // Only save scroll for search results
                sessionStorage.setItem('scholar_scroll_pos', container.scrollTop.toString());
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [activeReadlistId]);

    // Apply restoration when results appear
    useEffect(() => {
        if (hasResults && !isInitialLoading && !activeReadlistId) {
            const savedPos = sessionStorage.getItem('scholar_scroll_pos');
            if (savedPos && mainScrollRef.current) {
                // Use a small timeout to ensure DOM is fully rendered
                const timer = setTimeout(() => {
                    if (mainScrollRef.current) {
                        mainScrollRef.current.scrollTop = parseInt(savedPos, 10);
                    }
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [hasResults, isInitialLoading, activeReadlistId]);

    const renderSearchContent = () => {
        if (!hasResults && !isInitialLoading) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center py-10 md:py-20 text-center space-y-6 max-w-7xl mx-auto px-4 w-full">
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap size={56} className="text-scholar-600" />
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">ScholarSync</h1>
                    </div>
                    <SearchBar
                        query={searchState.query}
                        onChange={(val) => setSearchState(prev => ({ ...prev, query: val }))}
                        onSearch={(e) => { e?.preventDefault(); handleSearch(searchState.query); }}
                        isLoading={searchState.isLoading}
                    />
                    <p className="mt-4 text-sm text-slate-500">
                        Find <span className="font-semibold text-scholar-600">Open Access</span> research papers & create your personal library.
                    </p>
                </div>
            );
        }

        return (
            <>
                <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 mr-4">
                            <ProjectLogo />
                        </div>
                        <SearchBar
                            query={searchState.query}
                            onChange={(val) => setSearchState(prev => ({ ...prev, query: val }))}
                            onSearch={(e) => { e?.preventDefault(); handleSearch(searchState.query); }}
                            isLoading={searchState.isLoading}
                            isSticky={true}
                            isPagination={searchState.results.length > 0}
                        />
                    </div>
                </div>

                <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                    {isInitialLoading && <SearchingState />}

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
                                        onFindRelated={(p) => navigate(`/related-papers?paperId=${p.id}`)}
                                        isSaved={!!savedPapers[paper.id] && readlists.some(l => l.paperIds.includes(paper.id))}
                                    />
                                ))}
                            </div>

                            <div ref={observerTarget} className="py-8 flex justify-center">
                                {searchState.isLoading && <Spinner />}
                                {!searchState.isLoading && !hasMore && hasResults && (
                                    <p className="text-slate-400 text-sm">No more related papers found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    };

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
            showMobileMenuButton={!activeReadlistId && (hasResults || isInitialLoading || !!searchState.error)}
            scrollRef={mainScrollRef}
        >
            {activeReadlistId && activeList ? (
                <ReadlistDetail
                    readlist={activeList}
                    savedPapers={savedPapers}
                    onFindRelated={(p) => navigate(`/related-papers?paperId=${p.id}`)}
                    onBackToSearch={() => { setActiveReadlistId(null); setTimeout(() => document.getElementById('search-input')?.focus(), 0); }}
                />
            ) : (
                renderSearchContent()
            )}
        </MainLayout>
    );
}

const ProjectLogo = () => (
    <>
        <GraduationCap className="text-scholar-600" size={24} />
        <span className="font-bold text-slate-800">ScholarSync</span>
    </>
);
