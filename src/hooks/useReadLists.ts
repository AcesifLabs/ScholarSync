import { useState, useEffect, useCallback } from 'react';
import { Paper, ReadingList } from '@/types';

export const useReadLists = () => {
    const [readLists, setReadLists] = useState<ReadingList[]>([{ id: 'default', name: 'Untitled Read List', paperIds: [], createdAt: Date.now() }]);

    const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>({});

    const [activeReadListId, setActiveReadListId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLists = localStorage.getItem('scholar_readlists');
            if (savedLists) setReadLists(JSON.parse(savedLists));

            const savedPapers = localStorage.getItem('scholar_papers');
            if (savedPapers) setSavedPapers(JSON.parse(savedPapers));

            const savedActiveId = localStorage.getItem('scholar_active_list_id');
            if (savedActiveId) setActiveReadListId(savedActiveId);
            
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('scholar_readlists', JSON.stringify(readLists));
        }
    }, [readLists, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('scholar_papers', JSON.stringify(savedPapers));
        }
    }, [savedPapers, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            if (activeReadListId) {
                localStorage.setItem('scholar_active_list_id', activeReadListId);
            } else {
                localStorage.removeItem('scholar_active_list_id');
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

    const handleDeleteReadlist = useCallback((id: string) => {
        if (id === 'default') return; // Prevent deleting the default list
        setReadLists(prev => prev.filter(l => l.id !== id));
        if (activeReadListId === id) setActiveReadListId(null);
    }, [activeReadListId]);

    const handleAddToReadlist = useCallback((paper: Paper, targetListId?: string) => {
        const listToUse = targetListId || activeReadListId || (readLists.length > 0 ? readLists[0].id : null);
        if (!listToUse) {
            alert("Please create a readlist first.");
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

    const handleRemoveFromReadlist = useCallback((listId: string, paperId: string) => {
        setReadLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, paperIds: list.paperIds.filter(id => id !== paperId) };
            }
            return list;
        }));
    }, []);

    return {
        readLists: readLists,
        savedPapers,
        activeReadListId: activeReadListId,
        setActiveReadListId: setActiveReadListId,
        handleCreateReadList: handleCreateReadlist,
        handleRenameReadList,
        handleDeleteReadList: handleDeleteReadlist,
        handleAddToReadList: handleAddToReadlist,
        handleRemoveFromReadList: handleRemoveFromReadlist,
        isHydrated
    };
};
