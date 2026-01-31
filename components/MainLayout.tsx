import React from 'react';
import { Menu, GraduationCap } from 'lucide-react';
import { ReadlistSidebar } from './ReadlistSidebar';
import { Paper, Readlist } from '../types';

interface MainLayoutProps {
    children: React.ReactNode;
    readlists: Readlist[];
    activeReadlistId: string | null;
    setActiveReadlistId: (id: string | null) => void;
    handleCreateReadlist: (name: string) => void;
    handleDeleteReadlist: (id: string) => void;
    savedPapers: Record<string, Paper>;
    handleRemoveFromReadlist: (listId: string, paperId: string) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    showMobileMenuButton?: boolean;
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    onStartNewReadlist: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    readlists,
    activeReadlistId,
    setActiveReadlistId,
    handleCreateReadlist,
    handleDeleteReadlist,
    savedPapers,
    handleRemoveFromReadlist,
    isSidebarOpen,
    setSidebarOpen,
    showMobileMenuButton = true,
    scrollRef,
    onStartNewReadlist
}) => {
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
                onStartNewReadlist={() => {
                    onStartNewReadlist();
                    setSidebarOpen(false);
                }}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {showMobileMenuButton && (
                    <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden z-30 shrink-0">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-scholar-600" />
                            <span className="font-bold text-slate-800">ScholarSync</span>
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
