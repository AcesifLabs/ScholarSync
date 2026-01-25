import { useState, useEffect } from 'react';
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

    const [activeReadlistId, setActiveReadlistId] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('scholar_readlists', JSON.stringify(readlists));
    }, [readlists]);

    useEffect(() => {
        localStorage.setItem('scholar_papers', JSON.stringify(savedPapers));
    }, [savedPapers]);

    const handleCreateReadlist = (name: string) => {
        const newList: Readlist = {
            id: `list-${Date.now()}`,
            name,
            paperIds: [],
            createdAt: Date.now()
        };
        setReadlists(prev => [...prev, newList]);
        setActiveReadlistId(newList.id);
    };

    const handleDeleteReadlist = (id: string) => {
        if (confirm('Are you sure you want to delete this readlist?')) {
            setReadlists(prev => prev.filter(l => l.id !== id));
            if (activeReadlistId === id) setActiveReadlistId(null);
        }
    };

    const handleAddToReadlist = (paper: Paper) => {
        const targetListId = activeReadlistId || readlists[0]?.id;
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
    };

    const handleRemoveFromReadlist = (listId: string, paperId: string) => {
        setReadlists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, paperIds: list.paperIds.filter(id => id !== paperId) };
            }
            return list;
        }));
    };

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
