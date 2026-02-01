'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useReadLists } from '@/hooks/useReadLists';
import { SearchBar } from '@/components/SearchBar';
import { ReadListDetail } from '@/components/ReadListDetail';
import { MainLayout } from '@/components/MainLayout';
import { UI_TEXT } from '@/constants/appText';

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
        handleRemoveFromReadList,
        isLoggedIn
    } = useReadLists();

    const activeList = readLists.find(r => r.id === activeReadListId);

    const renderSearchContent = () => {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-10 md:py-20 text-center space-y-6 max-w-7xl mx-auto px-4 w-full">
                <div className="flex items-center gap-2 mb-4">
                    <GraduationCap size={56} className="text-scholar-600" />
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">{UI_TEXT.APP_NAME}</h1>
                </div>
                <SearchBar
                    query={searchState.query}
                    onChange={(val) => setSearchState(prev => ({ ...prev, query: val }))}
                    onSearch={(e) => {
                        e?.preventDefault();
                        const trimmedQuery = searchState.query.trim();
                        if (trimmedQuery) {
                            // Find the list to rename - either the specific active list or the default one if no active list is set
                            if (isLoggedIn) {
                                const listToRename = activeList || readLists.find(l => l.id === 'default');

                                if (listToRename && (listToRename.name === UI_TEXT.UNTITLED_READ_LIST || listToRename.name === UI_TEXT.UNTITLED_LIST || listToRename.name === UI_TEXT.UNTITLED_READING_LIST)) {
                                    handleRenameReadList(listToRename.id, trimmedQuery);
                                }
                            }
                            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
                        }
                    }}
                    isLoading={searchState.isLoading}
                />
                <p className="mt-4 text-sm text-slate-500">
                    Find <span className="font-semibold text-scholar-600">{UI_TEXT.OPEN_ACCESS}</span> research papers & create your personal library.
                </p>
            </div>
        );
    };

    const handleStartNewReadlist = () => {
        handleCreateReadList(UI_TEXT.UNTITLED_READ_LIST);
        clearSearch();
        router.push('/');
        // Focus search bar
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    };

    return (
        <MainLayout
            readLists={readLists}
            activeReadListId={activeReadListId}
            setActiveReadListIdAction={setActiveReadListId}
            handleCreateReadListAction={handleCreateReadList}
            handleDeleteReadListAction={handleDeleteReadList}
            handleRenameReadListAction={handleRenameReadList}
            handleUpdateReadListColorAction={handleUpdateReadListColor}
            savedPapers={savedPapers}
            handleRemoveFromReadListAction={handleRemoveFromReadList}
            onFindRelatedAction={(p) => router.push(`/related-papers?paperId=${p.id}`)}
            onViewPaper={(p) => router.push(`/paper/${p.id}`)}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpenAction={setSidebarOpen}
            showMobileMenuButton={true}
            scrollRef={mainScrollRef}
            onStartNewReadListAction={handleStartNewReadlist}
        >
            {activeReadListId && activeList && activeList.paperIds.length > 0 ? (
                <ReadListDetail
                    readList={activeList}
                    savedPapers={savedPapers}
                    onFindRelatedAction={(p) => router.push(`/related-papers?paperId=${p.id}`)}
                    onRemoveFromReadList={(p) => handleRemoveFromReadList(activeList.id, p.id)}
                    readLists={readLists}
                />
            ) : (
                <div className="flex flex-col h-full">
                    {renderSearchContent()}
                </div>
            )}
        </MainLayout>
    );
}
