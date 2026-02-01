'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, GraduationCap, User, LogOut, Settings } from 'lucide-react';
import { ReadListSidebar } from './ReadListSidebar';
import { MainLayoutProps } from '@/types';
import { UI_TEXT } from '@/constants/appText';
import { useSession, signIn, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { GoogleIcon } from './icons/GoogleIcon';

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    readLists,
    activeReadListId,
    setActiveReadListIdAction,
    handleCreateReadListAction,
    handleDeleteReadListAction,
    handleRenameReadListAction,
    handleUpdateReadListColorAction,
    savedPapers,
    handleRemoveFromReadListAction,
    onFindRelatedAction,
    onViewPaper,
    isSidebarOpen,
    setSidebarOpenAction,
    showMobileMenuButton = true,
    scrollRef,
    onStartNewReadListAction
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    setIsProfileOpen(false);
                    // Force a hard reload to clear all hook states
                    window.location.href = "/";
                }
            }
        });
    };

    return (
        <div className="flex h-screen bg-slate-50/50">
            <ReadListSidebar
                readLists={readLists}
                activeReadListId={activeReadListId}
                onSelectReadList={(id) => {
                    setActiveReadListIdAction(id);
                    setSidebarOpenAction(false);
                }}
                onCreateReadList={handleCreateReadListAction}
                onDeleteReadList={handleDeleteReadListAction}
                onRenameReadList={handleRenameReadListAction}
                onUpdateReadListColor={handleUpdateReadListColorAction}
                savedPapers={savedPapers}
                onRemovePaper={handleRemoveFromReadListAction}
                onFindRelatedAction={onFindRelatedAction}
                onViewPaper={onViewPaper}
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpenAction(false)}
                onStartNewReadList={() => {
                    onStartNewReadListAction();
                    setSidebarOpenAction(false);
                }}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Desktop and Mobile Header */}
                <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 p-3 flex items-center justify-between z-30 shrink-0">
                    <div className="flex items-center gap-2">
                        {showMobileMenuButton && (
                            <button onClick={() => setSidebarOpenAction(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md md:hidden">
                                <Menu size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-2 md:ml-2">
                            <GraduationCap className="text-scholar-600" size={24} />
                            <span className="font-bold text-slate-800 hidden sm:inline-block">{UI_TEXT.APP_NAME}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mr-2 relative" ref={profileRef}>
                        {isPending ? (
                            <div className="w-24 h-9 bg-slate-100 animate-pulse rounded-full" />
                        ) : session?.user ? (
                            <>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm"
                                >
                                    {session.user.image ? (
                                        <img src={session.user.image} alt="" className="w-7 h-7 rounded-full shadow-sm" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                            <User size={16} />
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">{session.user.name?.split(' ')[0]}</span>
                                </button>

                                {isProfileOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fadeInUp">
                                        <div className="px-4 py-3 border-b border-slate-50">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{session.user.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                                        </div>

                                        <div className="py-1">
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut size={16} />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={async () => {
                                    await signIn.social({
                                        provider: "google",
                                        callbackURL: "/",
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm font-medium text-sm"
                            >
                                <GoogleIcon />
                                <span>Sign In</span>
                            </button>
                        )}
                    </div>
                </header>

                <main
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto scroll-smooth relative"
                >
                    {children}
                </main>
            </div>
        </div>
    );
};
