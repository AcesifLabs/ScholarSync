import { useState, useEffect, useCallback } from 'react';
import { Paper, ReadingList, UseReadListsReturn } from '@/types';
import { STORAGE_KEYS, ERROR_MESSAGES, UI_TEXT } from '@/constants/appText';

export const useReadLists = (): UseReadListsReturn => {
    const [readLists, setReadLists] = useState<ReadingList[]>([{ id: 'default', name: UI_TEXT.UNTITLED_READ_LIST, paperIds: [], createdAt: Date.now() }]);

    const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>({});

    const [activeReadListId, setActiveReadListId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLists = localStorage.getItem(STORAGE_KEYS.READLISTS);
            if (savedLists) setReadLists(JSON.parse(savedLists));

            const savedPapers = localStorage.getItem(STORAGE_KEYS.PAPERS);
            if (savedPapers) setSavedPapers(JSON.parse(savedPapers));

            const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_LIST_ID);
            if (savedActiveId) setActiveReadListId(savedActiveId);
            
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(STORAGE_KEYS.READLISTS, JSON.stringify(readLists));
        }
    }, [readLists, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(savedPapers));
        }
    }, [savedPapers, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            if (activeReadListId) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_LIST_ID, activeReadListId);
            } else {
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_LIST_ID);
            }
        }
    }, [activeReadListId, isHydrated]);

    const handleCreateReadlist = useCallback((name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const existing = readLists.find(l => l.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
            setActiveReadListId(existing.id);
            return;
        }

        const newList: ReadingList = {
            id: `list-${Date.now()}`,
            name: trimmedName,
            paperIds: [],
            createdAt: Date.now()
        };
        setReadLists(prev => [...prev, newList]);
        setActiveReadListId(newList.id);
    }, [readLists]);

    const handleRenameReadList = useCallback((id: string, newName: string) => {
        setReadLists(prev => prev.map(list => 
            list.id === id ? { ...list, name: newName } : list
        ));
    }, []);

    const handleDeleteReadList = useCallback((id: string) => {
        if (readLists.length <= 1) return; // Prevent deleting if only one list remains
        setReadLists(prev => prev.filter(l => l.id !== id));
        if (activeReadListId === id) setActiveReadListId(null);
    }, [activeReadListId, readLists.length]);

    const handleAddToReadList = useCallback((paper: Paper, targetListId?: string) => {
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
    }, [activeReadListId, readLists]);

    const handleRemoveFromReadList = useCallback((listId: string, paperId: string) => {
        setReadLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, paperIds: list.paperIds.filter(id => id !== paperId) };
            }
            return list;
        }));
    }, []);

    const handleUpdateReadListColor = useCallback((id: string, color: string) => {
        setReadLists(prev => prev.map(list => 
            list.id === id ? { ...list, color } : list
        ));
    }, []);

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
        isHydrated
    };
};
