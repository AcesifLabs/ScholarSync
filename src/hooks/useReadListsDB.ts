// src/hooks/useReadListsDB.ts
import { useState, useEffect, useCallback } from 'react';
import { Paper, ReadingList } from '@/types';
import { authClient } from '@/lib/auth-client';
import * as actions from '@/app/api/reading-lists/actions';

export const useReadListsDB = () => {
    const { data: session } = authClient.useSession();
    const isLoggedIn = !!session?.user;

    const handleCreateReadList = useCallback(async (name: string, color?: string) => {
        if (!isLoggedIn) return null;
        const result = await actions.createReadingList(name, color);
        return result.data || null;
    }, [isLoggedIn]);

    const handleAddToReadList = useCallback(async (paper: Paper, listId: string) => {
        if (!isLoggedIn) return false;
        const result = await actions.addPaperToList(listId, paper);
        return !!result.success;
    }, [isLoggedIn]);

    const handleRemoveFromReadList = useCallback(async (listId: string, paperId: string) => {
        if (!isLoggedIn) return false;
        const result = await actions.removePaperFromList(listId, paperId);
        return !!result.success;
    }, [isLoggedIn]);

    const handleDeleteReadList = useCallback(async (id: string) => {
        if (!isLoggedIn) return false;
        const result = await actions.deleteReadingListAction(id);
        return !!result.success;
    }, [isLoggedIn]);

    const handleRenameReadList = useCallback(async (id: string, name: string) => {
        if (!isLoggedIn) return false;
        const result = await actions.renameReadingListAction(id, name);
        return !!result.success;
    }, [isLoggedIn]);

    const handleUpdateReadListColor = useCallback(async (id: string, color: string) => {
        if (!isLoggedIn) return false;
        const result = await actions.updateReadingListColorAction(id, color);
        return !!result.success;
    }, [isLoggedIn]);

    const fetchReadLists = useCallback(async () => {
        if (!isLoggedIn) return [];
        const result = await actions.getReadingLists();
        return result.data || [];
    }, [isLoggedIn]);

    return {
        isLoggedIn,
        handleCreateReadList,
        handleAddToReadList,
        handleRemoveFromReadList,
        handleDeleteReadList,
        handleRenameReadList,
        handleUpdateReadListColor,
        fetchReadLists
    };
};
