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
        handleCreateReadList: dbCreate, 
        handleAddToReadList: dbAdd,
        handleRemoveFromReadList: dbRemove,
        handleDeleteReadList: dbDelete,
        handleRenameReadList: dbRename,
        handleUpdateReadListColor: dbUpdateColor,
        fetchReadLists: dbFetch
    } = useReadListsDB();

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsHydrated(true);
        }
    }, []);

    // Initial fetch from DB if logged in
    useEffect(() => {
        if (isLoggedIn && isHydrated && USE_DATABASE_STORAGE) {
            dbFetch().then(lists => {
                // If logged in, we trust the DB. 
                // If it has lists, we use them. 
                // If it's empty, we show empty (the user can create new ones).
                setReadLists(lists);
            });
        }
    }, [isLoggedIn, isHydrated, dbFetch]);

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

        const newList: ReadingList = {
            id: `list-${Date.now()}`,
            name: finalName,
            paperIds: [],
            createdAt: Date.now()
        };
        
        setReadLists(prev => [...prev, newList]);
        setActiveReadListId(newList.id);

        if (USE_DATABASE_STORAGE) {
            try {
                const dbList = await dbCreate(finalName);
                if (dbList) {
                    setReadLists(prev => prev.map(l => l.id === newList.id ? dbList : l));
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

        setReadLists(prev => prev.map(list => 
            list.id === id ? { ...list, name: newName } : list
        ));

        if (USE_DATABASE_STORAGE && !id.startsWith('list-')) {
            await dbRename(id, newName);
        }
    }, [isLoggedIn, dbRename, openAuthModal]);

    const handleDeleteReadList = useCallback(async (id: string) => {
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        if (readLists.length <= 1) return; // Prevent deleting if only one list remains
        setReadLists(prev => prev.filter(l => l.id !== id));
        if (activeReadListId === id) setActiveReadListId(null);

        if (USE_DATABASE_STORAGE && !id.startsWith('list-')) {
            await dbDelete(id);
        }
    }, [activeReadListId, readLists.length, isLoggedIn, dbDelete, openAuthModal]);

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

        if (USE_DATABASE_STORAGE && !listToUse.startsWith('list-')) {
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

        if (USE_DATABASE_STORAGE && !listId.startsWith('list-')) {
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

        if (USE_DATABASE_STORAGE && !id.startsWith('list-')) {
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
        isLoggedIn
    };
};
