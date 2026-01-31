import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { useReadlists } from '../hooks/useReadlists';

import { PaperCard } from '../components/PaperCard';
import { PaperCardSkeleton } from '../components/Skeleton';
import { SearchBar } from '../components/SearchBar';
import { ReadlistDetail } from '../components/ReadlistDetail';
import { MainLayout } from '../components/MainLayout';

export default function Home() {
    const navigate = useNavigate();
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

    const activeList = readlists.find(r => r.id === activeReadlistId);
    const hasResults = searchState.results.length > 0;
    const isInitialLoading = searchState.isLoading && searchState.results.length === 0;

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

    useEffect(() => {
        const container = mainScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (!activeReadlistId) {
                sessionStorage.setItem('scholar_scroll_pos', container.scrollTop.toString());
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [activeReadlistId]);

    useEffect(() => {
        if (hasResults && !isInitialLoading && !activeReadlistId) {
            const savedPos = sessionStorage.getItem('scholar_scroll_pos');
            if (savedPos && mainScrollRef.current) {
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
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-10 md:py-20 text-center space-y-6 max-w-7xl mx-auto px-4 w-full">
                <div className="flex items-center gap-2 mb-4">
                    <GraduationCap size={56} className="text-scholar-600" />
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">ScholarSync</h1>
                </div>
                <SearchBar
                    query={searchState.query}
                    onChange={(val) => setSearchState(prev => ({ ...prev, query: val }))}
                    onSearch={(e) => {
                        e?.preventDefault();
                        const trimmedQuery = searchState.query.trim();
                        if (trimmedQuery) {
                            handleCreateReadlist(trimmedQuery);
                            navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
                        }
                    }}
                    isLoading={searchState.isLoading}
                />
                <p className="mt-4 text-sm text-slate-500">
                    Find <span className="font-semibold text-scholar-600">Open Access</span> research papers & create your personal library.
                </p>
            </div>
        );
    };

    const handleStartNewReadlist = () => {
        setActiveReadlistId(null);
        clearSearch();
        navigate('/');
        // Focus search bar
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
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
            showMobileMenuButton={!activeReadlistId}
            scrollRef={mainScrollRef}
            onStartNewReadlist={handleStartNewReadlist}
        >
            {activeReadlistId && activeList ? (
                <ReadlistDetail
                    readlist={activeList}
                    savedPapers={savedPapers}
                    onFindRelated={(p) => navigate(`/related-papers?paperId=${p.id}`)}
                    onBackToSearch={() => {
                        setActiveReadlistId(null);
                        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
                    }}
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
