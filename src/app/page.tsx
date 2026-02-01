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
        handleRenameReadList,
        handleUpdateReadListColor,
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
                            // Find the list to rename - either the specific active list or the default one if no active list is set
                            const listToRename = activeList || readLists.find(l => l.id === 'default');
                            
                            if (listToRename && (listToRename.name === 'Untitled Read List' || listToRename.name === 'Untitled List' || listToRename.name === 'Untitled Reading List')) {
                                handleRenameReadList(listToRename.id, trimmedQuery);
                            }
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
        handleCreateReadList('Untitled Read List');
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
            handleRenameReadList={handleRenameReadList}
            handleUpdateReadListColor={handleUpdateReadListColor}
            savedPapers={savedPapers}
            handleRemoveFromReadList={handleRemoveFromReadList}
            onFindRelated={(p) => router.push(`/related-papers?paperId=${p.id}`)}
            onViewPaper={(p) => router.push(`/paper/${p.id}`)}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
            showMobileMenuButton={true}
            scrollRef={mainScrollRef}
            onStartNewReadList={handleStartNewReadlist}
        >
            {activeReadListId && activeList && activeList.paperIds.length > 0 ? (
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
                <div className="flex flex-col h-full">
                    {activeList && activeList.paperIds.length === 0 && (
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
                            <div className="bg-scholar-50 border border-scholar-100 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-scholar-900">{activeList.name}</h2>
                                    <p className="text-sm text-scholar-700">This list is currently empty. Use the search below to add papers.</p>
                                </div>
                                <div className="hidden sm:block">
                                    <span className="text-xs font-semibold text-scholar-600 uppercase tracking-wider">New List</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {renderSearchContent()}
                </div>
            )}
        </MainLayout>
    );
}
