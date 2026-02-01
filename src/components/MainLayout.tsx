'use client';

import React, { useState } from 'react';
import { Menu, GraduationCap } from 'lucide-react';
import { ReadListSidebar } from './ReadListSidebar';
import { MainLayoutProps } from '@/types';
import { UI_TEXT } from '@/constants/appText';

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    readLists,
    activeReadListId,
    setActiveReadListId,
    handleCreateReadList,
    handleDeleteReadList,
    handleRenameReadList,
    handleUpdateReadListColor,
    savedPapers,
    handleRemoveFromReadList,
    onFindRelatedAction,
    onViewPaper,
    isSidebarOpen,
    setSidebarOpen,
    showMobileMenuButton = true,
    scrollRef,
    onStartNewReadList
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50/50">
            <ReadListSidebar
                readLists={readLists}
                activeReadListId={activeReadListId}
                onSelectReadList={(id) => {
                    setActiveReadListId(id);
                    setSidebarOpen(false);
                }}
                onCreateReadList={handleCreateReadList}
                onDeleteReadList={handleDeleteReadList}
                onRenameReadList={handleRenameReadList}
                onUpdateReadListColor={handleUpdateReadListColor}
                savedPapers={savedPapers}
                onRemovePaper={handleRemoveFromReadList}
                onFindRelatedAction={onFindRelatedAction}
                onViewPaper={onViewPaper}
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onStartNewReadList={() => {
                    onStartNewReadList();
                    setSidebarOpen(false);
                }}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {showMobileMenuButton && (
                    <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden z-30 shrink-0">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-scholar-600" />
                            <span className="font-bold text-slate-800">{UI_TEXT.APP_NAME}</span>
                        </div>
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
                            <Menu size={24} />
                        </button>
                    </header>
                )}

                <main
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto scroll-smooth relative"
                >
                    {showMobileMenuButton && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden fixed top-3 right-4 z-50 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm border border-slate-200 text-slate-600"
                        >
                            <Menu size={20} />
                        </button>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
};
