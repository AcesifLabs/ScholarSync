import { useState, useEffect, useCallback } from 'react';
import { Paper, ReadingList } from '@/types';

export const useReadLists = () => {
    const [readLists, setReadLists] = useState<ReadingList[]>([{ id: 'default', name: 'My Papers', paperIds: [], createdAt: Date.now() }]);

    const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>({});

    const [activeReadListId, setActiveReadListId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLists = localStorage.getItem('scholar_readlists');
            if (savedLists) setReadLists(JSON.parse(savedLists));

            const savedPapers = localStorage.getItem('scholar_papers');
            if (savedPapers) setSavedPapers(JSON.parse(savedPapers));

            const savedActiveId = localStorage.getItem('scholar_active_list_id');
            if (savedActiveId) setActiveReadListId(savedActiveId);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('scholar_readlists', JSON.stringify(readLists));
    }, [readLists]);

    useEffect(() => {
        localStorage.setItem('scholar_papers', JSON.stringify(savedPapers));
    }, [savedPapers]);

    useEffect(() => {
        if (activeReadListId) {
            localStorage.setItem('scholar_active_list_id', activeReadListId);
        } else {
            localStorage.removeItem('scholar_active_list_id');
        }
    }, [activeReadListId]);

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

    const handleDeleteReadlist = useCallback((id: string) => {
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
        handleDeleteReadList: handleDeleteReadlist,
        handleAddToReadList: handleAddToReadlist,
        handleRemoveFromReadList: handleRemoveFromReadlist
    };
};
