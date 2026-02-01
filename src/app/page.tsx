'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { useReadLists } from '../hooks/useReadLists';

import { SearchBar } from '../components/SearchBar';
import { ReadListDetail } from '../components/ReadListDetail';
import { MainLayout } from '../components/MainLayout';

export default function Home() {
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const {
        searchState,
        setSearchState,
        clearSearch
    } = useSearch();

    const {
        readLists,
        savedPapers,
        activeReadListId,
        setActiveReadListId,
        handleCreateReadList,
        handleDeleteReadList,
        handleRemoveFromReadList
    } = useReadLists();

    const activeList = readLists.find(r => r.id === activeReadListId);

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
                            handleCreateReadList(trimmedQuery);
                            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
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
        setActiveReadListId(null);
        clearSearch();
        router.push('/');
        // Focus search bar
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    };

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
            showMobileMenuButton={!activeReadListId}
            scrollRef={mainScrollRef}
            onStartNewReadList={handleStartNewReadlist}
        >
            {activeReadListId && activeList ? (
                <ReadListDetail
                    readList={activeList}
                    savedPapers={savedPapers}
                    onFindRelated={(p) => router.push(`/related-papers?paperId=${p.id}`)}
                    onRemoveFromReadList={(p) => handleRemoveFromReadList(activeList.id, p.id)}
                    readLists={readLists}
                    onBackToSearch={() => {
                        setActiveReadListId(null);
                        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
                    }}
                />
            ) : (
                renderSearchContent()
            )}
        </MainLayout>
    );
}
