import { useState, useEffect, useCallback } from 'react';
import { Paper, Readlist } from '../types';

export const useReadlists = () => {
    const [readlists, setReadlists] = useState<Readlist[]>(() => {
        const saved = localStorage.getItem('scholar_readlists');
        return saved ? JSON.parse(saved) : [{ id: 'default', name: 'My Papers', paperIds: [], createdAt: Date.now() }];
    });

    const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>(() => {
        const saved = localStorage.getItem('scholar_papers');
        return saved ? JSON.parse(saved) : {};
    });

    const [activeReadlistId, setActiveReadlistId] = useState<string | null>(() => {
        return localStorage.getItem('scholar_active_list_id');
    });

    useEffect(() => {
        localStorage.setItem('scholar_readlists', JSON.stringify(readlists));
    }, [readlists]);

    useEffect(() => {
        localStorage.setItem('scholar_papers', JSON.stringify(savedPapers));
    }, [savedPapers]);

    useEffect(() => {
        if (activeReadlistId) {
            localStorage.setItem('scholar_active_list_id', activeReadlistId);
        } else {
            localStorage.removeItem('scholar_active_list_id');
        }
    }, [activeReadlistId]);

    const handleCreateReadlist = useCallback((name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Check for existing list with same name
        const existing = readlists.find(l => l.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
            setActiveReadlistId(existing.id);
            return;
        }

        const newList: Readlist = {
            id: `list-${Date.now()}`,
            name: trimmedName,
            paperIds: [],
            createdAt: Date.now()
        };
        setReadlists(prev => [...prev, newList]);
        setActiveReadlistId(newList.id);
    }, [readlists]);

    const handleDeleteReadlist = useCallback((id: string) => {
        setReadlists(prev => prev.filter(l => l.id !== id));
        if (activeReadlistId === id) setActiveReadlistId(null);
    }, [activeReadlistId]);

    const handleAddToReadlist = useCallback((paper: Paper) => {
        const targetListId = activeReadlistId || (readlists.length > 0 ? readlists[0].id : null);
        if (!targetListId) {
            alert("Please create a readlist first.");
            return;
        }

        setSavedPapers(prev => ({ ...prev, [paper.id]: paper }));
        setReadlists(prev => prev.map(list => {
            if (list.id === targetListId) {
                if (list.paperIds.includes(paper.id)) return list;
                return { ...list, paperIds: [...list.paperIds, paper.id] };
            }
            return list;
        }));
    }, [activeReadlistId, readlists]);

    const handleRemoveFromReadlist = useCallback((listId: string, paperId: string) => {
        setReadlists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, paperIds: list.paperIds.filter(id => id !== paperId) };
            }
            return list;
        }));
    }, []);

    return {
        readlists,
        savedPapers,
        activeReadlistId,
        setActiveReadlistId,
        handleCreateReadlist,
        handleDeleteReadlist,
        handleAddToReadlist,
        handleRemoveFromReadlist
    };
};
