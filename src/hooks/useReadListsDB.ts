// src/hooks/useReadListsDB.ts
import { useState, useEffect, useCallback } from 'react';
import { Paper, ReadingList } from '@/types';
import { authClient } from '@/lib/auth-client';
import * as actions from '@/app/api/reading-lists/actions';

export const useReadListsDB = () => {
    const { data: session, isPending } = authClient.useSession();
    const isLoggedIn = !!session?.user;

    const handleCreateReadList = useCallback(async (name: string, color?: string) => {
        if (!isLoggedIn) return null;
        console.log("[DB] Creating list:", name);
        const result = await actions.createReadingList(name, color);
        if (result.error) console.error("[DB] Create failed:", result.error);
        return result.data || null;
    }, [isLoggedIn]);

    const handleAddToReadList = useCallback(async (paper: Paper, listId: string) => {
        if (!isLoggedIn) return false;
        console.log("[DB] Adding paper:", paper.id, "to", listId);
        const result = await actions.addPaperToList(listId, paper);
        if (result.error) console.error("[DB] Add failed:", result.error);
        return !!result.success;
    }, [isLoggedIn]);

    const handleRemoveFromReadList = useCallback(async (listId: string, paperId: string) => {
        if (!isLoggedIn) return false;
        console.log("[DB] Removing paper:", paperId, "from", listId);
        const result = await actions.removePaperFromList(listId, paperId);
        return !!result.success;
    }, [isLoggedIn]);

    const handleDeleteReadList = useCallback(async (id: string) => {
        if (!isLoggedIn) return false;
        console.log("[DB] Deleting list:", id);
        const result = await actions.deleteReadingListAction(id);
        return !!result.success;
    }, [isLoggedIn]);

    const handleRenameReadList = useCallback(async (id: string, name: string) => {
        if (!isLoggedIn) return false;
        console.log("[DB] Renaming list:", id, "to", name);
        const result = await actions.renameReadingListAction(id, name);
        return !!result.success;
    }, [isLoggedIn]);

    const handleUpdateReadListColor = useCallback(async (id: string, color: string) => {
        if (!isLoggedIn) return false;
        const result = await actions.updateReadingListColorAction(id, color);
        return !!result.success;
    }, [isLoggedIn]);

    const fetchReadLists = useCallback(async () => {
        if (!isLoggedIn) return { lists: [], papers: {} };
        const result = await actions.getReadingLists();
        return result.data || { lists: [], papers: {} };
    }, [isLoggedIn]);

    return {
        isLoggedIn,
        isPending,
        handleCreateReadList,
        handleAddToReadList,
        handleRemoveFromReadList,
        handleDeleteReadList,
        handleRenameReadList,
        handleUpdateReadListColor,
        fetchReadLists
    };
};
