import { useState, useEffect, useCallback, useRef } from 'react';
import { Paper, ReadingList, UseReadListsReturn } from '@/types';
import { ERROR_MESSAGES, UI_TEXT } from '@/constants/appText';
import { useReadListsDB } from './useReadListsDB';
import { useUI } from '@/context/UIContext';

const USE_DATABASE_STORAGE = process.env.NEXT_PUBLIC_USE_DATABASE_STORAGE === 'true';

export const useReadLists = (): UseReadListsReturn => {
    const { openAuthModal } = useUI();
    const [readLists, setReadLists] = useState<ReadingList[]>([{ id: 'default', name: UI_TEXT.UNTITLED_READ_LIST, paperIds: [], createdAt: Date.now() }]);

    const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>({});

    const [activeReadListId, setActiveReadListId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    const { 
        isLoggedIn, 
        isPending,
        handleCreateReadList: dbCreate, 
        handleAddToReadList: dbAdd,
        handleRemoveFromReadList: dbRemove,
        handleDeleteReadList: dbDelete,
        handleRenameReadList: dbRename,
        handleUpdateReadListColor: dbUpdateColor,
        fetchReadLists: dbFetch
    } = useReadListsDB();

    // Use a ref to track if we've already done the initial fetch to avoid loops
    const hasFetched = useRef(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsHydrated(true);
        }
    }, []);

    // Initial fetch from DB if logged in
    useEffect(() => {
        if (isLoggedIn && isHydrated && USE_DATABASE_STORAGE) {
            console.log("[useReadLists] Fetching lists from DB...");
            dbFetch().then(({ lists, papers }) => {
                console.log("[useReadLists] DB Fetch result:", lists.length, "lists", Object.keys(papers).length, "papers");
                setReadLists(lists);
                setSavedPapers(papers);
                
                if (lists.length > 0) {
                    if (!activeReadListId || !lists.find(l => l.id === activeReadListId)) {
                        setActiveReadListId(lists[0].id);
                    }
                } else {
                    setReadLists([]);
                    setSavedPapers({});
                    setActiveReadListId(null);
                }
            });
        } else if (!isLoggedIn && isHydrated) {
            // Reset to guest state if not logged in
            setReadLists([{ id: 'default', name: UI_TEXT.UNTITLED_READ_LIST, paperIds: [], createdAt: Date.now() }]);
            setSavedPapers({});
            setActiveReadListId('default');
        }
    }, [isLoggedIn, isHydrated, dbFetch]); // Remove activeReadListId dependency to avoid refresh loops

    const handleCreateReadlist = useCallback(async (name: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Handle duplicate names by appending a number
        let finalName = trimmedName;
        let counter = 1;
        while (readLists.some(l => l.name.toLowerCase() === finalName.toLowerCase())) {
            finalName = `${trimmedName} (${counter})`;
            counter++;
        }

        // Optimistically add to UI with a temp ID
        const tempId = `list-${Date.now()}`;
        const newList: ReadingList = {
            id: tempId,
            name: finalName,
            paperIds: [],
            createdAt: Date.now()
        };
        
        setReadLists(prev => [...prev, newList]);
        setActiveReadListId(tempId);

        if (USE_DATABASE_STORAGE) {
            try {
                const dbList = await dbCreate(finalName);
                if (dbList) {
                    // Replace temp ID with real DB ID
                    setReadLists(prev => prev.map(l => l.id === tempId ? dbList : l));
                    setActiveReadListId(dbList.id);
                }
            } catch (error) {
                console.error("Failed to create list in DB:", error);
            }
        }
    }, [readLists, isLoggedIn, dbCreate, openAuthModal]);

    const handleRenameReadList = useCallback(async (id: string, newName: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        const trimmedName = newName.trim();
        if (!trimmedName) return;

        setReadLists(prev => prev.map(list => 
            list.id === id ? { ...list, name: trimmedName } : list
        ));

        if (USE_DATABASE_STORAGE) {
            await dbRename(id, trimmedName);
        }
    }, [isLoggedIn, dbRename, openAuthModal]);

    const handleDeleteReadList = useCallback(async (id: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        if (readLists.length <= 1) return; // Prevent deleting if only one list remains
        setReadLists(prev => prev.filter(l => l.id !== id));
        if (activeReadListId === id) {
            const remaining = readLists.filter(l => l.id !== id);
            setActiveReadListId(remaining.length > 0 ? remaining[0].id : null);
        }

        if (USE_DATABASE_STORAGE) {
            await dbDelete(id);
        }
    }, [activeReadListId, readLists, isLoggedIn, dbDelete, openAuthModal]);

    const handleAddToReadList = useCallback(async (paper: Paper, targetListId?: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        const listToUse = targetListId || activeReadListId || (readLists.length > 0 ? readLists[0].id : null);
        if (!listToUse) {
            alert(ERROR_MESSAGES.CREATE_LIST_FIRST);
            return;
        }

        setSavedPapers(prev => ({ ...prev, [paper.id]: paper }));
        setReadLists(prev => prev.map(list => {
            if (list.id === listToUse) {
                if (list.paperIds.includes(paper.id)) return list;
                return { ...list, paperIds: [...list.paperIds, paper.id] };
            }
            return list;
        }));

        if (USE_DATABASE_STORAGE) {
            // If the ID is a temp ID, we might be in the middle of a creation.
            // Let's try to find if a real ID has already replaced it in the state.
            if (listToUse.startsWith('list-')) {
                // Wait a bit or check if it was replaced
                const currentList = readLists.find(l => l.id === listToUse);
                if (currentList) {
                    // Still temp ID. This is problematic. 
                    // For now, let's just log it. 
                    console.warn("[Save] Still using temp ID for save action");
                }
            }
            await dbAdd(paper, listToUse);
        }
    }, [activeReadListId, readLists, isLoggedIn, dbAdd, openAuthModal]);

    const handleRemoveFromReadList = useCallback(async (listId: string, paperId: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        setReadLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, paperIds: list.paperIds.filter(id => id !== paperId) };
            }
            return list;
        }));

        if (USE_DATABASE_STORAGE) {
            await dbRemove(listId, paperId);
        }
    }, [isLoggedIn, dbRemove, openAuthModal]);

    const handleUpdateReadListColor = useCallback(async (id: string, color: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        setReadLists(prev => prev.map(list => 
            list.id === id ? { ...list, color } : list
        ));

        if (USE_DATABASE_STORAGE) {
            await dbUpdateColor(id, color);
        }
    }, [isLoggedIn, dbUpdateColor, openAuthModal]);

    return {
        readLists: readLists,
        savedPapers,
        activeReadListId: activeReadListId,
        setActiveReadListId: setActiveReadListId,
        handleCreateReadList: handleCreateReadlist,
        handleRenameReadList,
        handleUpdateReadListColor,
        handleDeleteReadList,
        handleAddToReadList,
        handleRemoveFromReadList,
        isHydrated,
        isLoggedIn,
        isAuthLoading: isPending
    };
};
