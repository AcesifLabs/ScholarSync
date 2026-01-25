import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Menu, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchPapers, findRelatedPapers } from '../services/paperService.ts';
import { Paper, Readlist, SearchState } from '../types';
import { PaperCard } from '../components/PaperCard';
import { ReadlistSidebar } from '../components/ReadlistSidebar';
import { Spinner } from '../components/Spinner';

export default function Home() {
    const navigate = useNavigate();
    const [searchState, setSearchState] = useState<SearchState>(() => {
        const saved = localStorage.getItem('scholar_search_state');
        return saved ? JSON.parse(saved) : {
            isLoading: false,
            results: [],
            error: null,
            query: ''
        };
    });

    const [activeQuery, setActiveQuery] = useState(() => {
        return localStorage.getItem('scholar_active_query') || '';
    });

    const [page, setPage] = useState(() => {
        const saved = localStorage.getItem('scholar_page');
        return saved ? parseInt(saved, 10) : 1;
    });

    const [hasMore, setHasMore] = useState(() => {
        const saved = localStorage.getItem('scholar_has_more');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [readlists, setReadlists] = useState<Readlist[]>(() => {
        const saved = localStorage.getItem('scholar_readlists');
        return saved ? JSON.parse(saved) : [{ id: 'default', name: 'My Papers', paperIds: [], createdAt: Date.now() }];
    });

    const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>(() => {
        const saved = localStorage.getItem('scholar_papers');
        return saved ? JSON.parse(saved) : {};
    });

    const [activeReadlistId, setActiveReadlistId] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const observerTarget = useRef<HTMLDivElement>(null);
    const lastRequestTime = useRef<number>(0);

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('scholar_readlists', JSON.stringify(readlists));
    }, [readlists]);

    useEffect(() => {
        localStorage.setItem('scholar_papers', JSON.stringify(savedPapers));
    }, [savedPapers]);

    useEffect(() => {
        localStorage.setItem('scholar_search_state', JSON.stringify({ ...searchState, isLoading: false }));
    }, [searchState]);

    useEffect(() => {
        localStorage.setItem('scholar_active_query', activeQuery);
    }, [activeQuery]);

    useEffect(() => {
        localStorage.setItem('scholar_page', page.toString());
    }, [page]);

    useEffect(() => {
        localStorage.setItem('scholar_has_more', JSON.stringify(hasMore));
    }, [hasMore]);

    // Handle Infinite Scroll
    const handleLoadMore = useCallback(async () => {
        if (searchState.isLoading || !hasMore || !activeQuery) return;

        const nextPage = page + 1;
        setPage(nextPage);
        setSearchState(prev => ({ ...prev, isLoading: true }));

        try {
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime.current;
            const delay = Math.max(0, 1000 - timeSinceLastRequest);

            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const { papers } = await searchPapers(activeQuery, nextPage);
            lastRequestTime.current = Date.now();
            if (papers.length === 0) {
                setHasMore(false);
                setSearchState(prev => ({ ...prev, isLoading: false }));
            } else {
                setSearchState(prev => ({
                    ...prev,
                    isLoading: false,
                    results: [...prev.results, ...papers]
                }));
            }
        } catch (err) {
            setSearchState(prev => ({ ...prev, isLoading: false }));
            console.error("Failed to load more papers (swallowed):", err);
        }
    }, [searchState.isLoading, hasMore, activeQuery, page]);

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

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const queryToUse = searchState.query.trim();
        if (!queryToUse) return;

        setActiveQuery(queryToUse);
        setPage(1);
        setHasMore(true);
        setSearchState(prev => ({ ...prev, isLoading: true, error: null, results: [] }));
        setActiveReadlistId(null);

        try {
            const { papers } = await searchPapers(queryToUse, 1);
            if (papers.length === 0) {
                setSearchState(prev => ({ ...prev, isLoading: false, results: [] }));
            } else {
                setSearchState(prev => ({ ...prev, isLoading: false, results: papers }));
            }
        } catch (err) {
            console.error("Fetch papers failed (swallowed):", err);
            setSearchState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleFindRelated = (paper: Paper) => {
        // Navigate to related papers graph view
        navigate(`/related-papers?paperId=${paper.id}`);
    };

    const handleCreateReadlist = (name: string) => {
        const newList: Readlist = {
            id: `list-${Date.now()}`,
            name,
            paperIds: [],
            createdAt: Date.now()
        };
        setReadlists(prev => [...prev, newList]);
        setActiveReadlistId(newList.id);
    };

    const handleDeleteReadlist = (id: string) => {
        if (confirm('Are you sure you want to delete this readlist?')) {
            setReadlists(prev => prev.filter(l => l.id !== id));
            if (activeReadlistId === id) setActiveReadlistId(null);
        }
    };

    const handleAddToReadlist = (paper: Paper) => {
        const targetListId = activeReadlistId || readlists[0]?.id;
        if (!targetListId) {
            alert("Please create a readlist first.");
            return;
        }

        setSavedPapers(prev => ({ ...prev, [paper.id]: paper }));
        setReadlists(prev => prev.map(list => {
            if (list.id === targetListId) {
                if (list.paperIds.includes(paper.id)) return list;
                return { ...list, paperIds: [...list.paperIds, paper.id] };
            }
            return list;
        }));
    };

    const handleRemoveFromReadlist = (listId: string, paperId: string) => {
        setReadlists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, paperIds: list.paperIds.filter(id => id !== paperId) };
            }
            return list;
        }));
    };

    const activeList = readlists.find(r => r.id === activeReadlistId);

    const renderSearchBar = (isSticky: boolean) => (
        <form onSubmit={handleSearch} className={`w-full relative ${isSticky ? '' : 'max-w-2xl'}`}>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className={`h-5 w-5 ${isSticky ? 'text-slate-500' : 'text-slate-400'} group-focus-within:text-scholar-500 transition-colors`} />
                </div>
                <input
                    id="search-input"
                    type="text"
                    value={searchState.query}
                    onChange={(e) => setSearchState(prev => ({ ...prev, query: e.target.value }))}
                    className={`block w-full pl-11 pr-4 ${isSticky ? 'py-3 text-base' : 'py-4 text-lg'} bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-scholar-500/20 focus:border-scholar-500 transition-all`}
                    placeholder="Search for topics..."
                />
                <button
                    type="submit"
                    className={`absolute right-2 top-2 bottom-2 bg-scholar-600 text-white rounded-xl font-medium hover:bg-scholar-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSticky ? 'px-4 text-sm' : 'px-6'} flex items-center justify-center min-w-[80px]`}
                    disabled={!searchState.query.trim()}
                >
                    {searchState.isLoading && page === 1 ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Search'}
                </button>
            </div>
        </form>
    );

    let content;
    if (activeReadlistId && activeList) {
        const papersInList = activeList.paperIds.map(id => savedPapers[id]).filter(Boolean);
        content = (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeList.name}</h2>
                        <p className="text-slate-500">{papersInList.length} papers saved</p>
                    </div>
                </div>

                {papersInList.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No papers in this list yet.</p>
                        <button
                            onClick={() => { setActiveReadlistId(null); document.getElementById('search-input')?.focus(); }}
                            className="mt-4 text-scholar-600 font-medium hover:underline"
                        >
                            Start searching
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {papersInList.map(paper => (
                            <PaperCard
                                key={paper.id}
                                paper={paper}
                                onAddToReadlist={() => { }}
                                onFindRelated={handleFindRelated}
                                isSaved={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    } else {
        const hasResults = searchState.results.length > 0;
        const isInitialLoading = searchState.isLoading && page === 1;

        content = (
            <div className="min-h-full flex flex-col">

                {!hasResults && !isInitialLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 md:py-20 text-center space-y-6 max-w-7xl mx-auto px-4 w-full">
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap size={56} className="text-scholar-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">ScholarStream</h1>
                        </div>
                        {renderSearchBar(false)}
                        <p className="mt-4 text-sm text-slate-500">
                            Find <span className="font-semibold text-scholar-600">Open Access</span> research papers & create your personal library.
                        </p>
                    </div>
                )}

                {(hasResults || isInitialLoading) && (
                    <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 mr-4">
                                <GraduationCap className="text-scholar-600" size={24} />
                                <span className="font-bold text-slate-800">ScholarStream</span>
                            </div>
                            {renderSearchBar(true)}
                        </div>
                    </div>
                )}

                <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

                    {isInitialLoading && (
                        <div className="py-24 flex flex-col items-center justify-center space-y-8">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                {/* Animated Outer Ring */}
                                <div className="absolute inset-0 border-4 border-scholar-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-scholar-600 rounded-full animate-spin"></div>

                                {/* Inner Pulsing Icon */}
                                <div className="bg-scholar-50 p-4 rounded-full animate-pulse shadow-sm">
                                    <GraduationCap size={32} className="text-scholar-600" />
                                </div>
                            </div>

                            <div className="text-center space-y-3">
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                                    Searching
                                    <span className="flex gap-1 ml-0.5">
                                        <span className="w-1.5 h-1.5 bg-scholar-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-scholar-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-scholar-600 rounded-full animate-bounce"></span>
                                    </span>
                                </h2>
                                <p className="text-slate-500 font-medium max-w-xs mx-auto animate-pulse">
                                    Sifting through millions of open-access papers just for you...
                                </p>
                            </div>

                            {/* Progress Bar Mockup */}
                            <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-scholar-500 via-violet-500 to-scholar-500 w-full animate-progress-shimmer"></div>
                            </div>
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
                                {searchState.results.map((paper, index) => {
                                    const isSaved = !!savedPapers[paper.id] &&
                                        readlists.some(l => l.paperIds.includes(paper.id));
                                    return (
                                        <PaperCard
                                            key={`${paper.id}-${index}`}
                                            paper={paper}
                                            onAddToReadlist={handleAddToReadlist}
                                            onFindRelated={handleFindRelated}
                                            isSaved={isSaved}
                                        />
                                    );
                                })}
                            </div>

                            {/* Infinite Scroll Loader/Sentinel */}
                            <div ref={observerTarget} className="py-8 flex justify-center">
                                {searchState.isLoading && page > 1 && (
                                    <Spinner />
                                )}
                                {!searchState.isLoading && !hasMore && hasResults && (
                                    <p className="text-slate-400 text-sm">No more related papers found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50/50">
            <ReadlistSidebar
                readlists={readlists}
                activeReadlistId={activeReadlistId}
                onSelectReadlist={(id) => {
                    setActiveReadlistId(id);
                    setSidebarOpen(false);
                }}
                onCreateReadlist={handleCreateReadlist}
                onDeleteReadlist={handleDeleteReadlist}
                savedPapers={savedPapers}
                onRemovePaper={handleRemoveFromReadlist}
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {(!activeReadlistId && (searchState.results.length > 0 || (searchState.isLoading && page === 1))) ? null : (
                    <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden z-30 shrink-0">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-scholar-600" />
                            <span className="font-bold text-slate-800">ScholarStream</span>
                        </div>
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
                            <Menu size={24} />
                        </button>
                    </header>
                )}

                <main className="flex-1 overflow-y-auto scroll-smooth relative">
                    {(!activeReadlistId && (searchState.results.length > 0 || (searchState.isLoading && page === 1))) && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden fixed top-3 right-4 z-50 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm border border-slate-200 text-slate-600"
                        >
                            <Menu size={20} />
                        </button>
                    )}

                    {content}
                </main>
            </div>
        </div>
    );
}
