import { Paper, ReadingList } from './models';
import { SearchState } from './search';
import React from "react";

export interface UseReadListsReturn {
    readLists: ReadingList[];
    savedPapers: Record<string, Paper>;
    activeReadListId: string | null;
    setActiveReadListId: React.Dispatch<React.SetStateAction<string | null>>;
    handleCreateReadList: (name: string) => void;
    handleRenameReadList: (id: string, newName: string) => void;
    handleUpdateReadListColor: (id: string, color: string) => void;
    handleDeleteReadList: (id: string) => void;
    handleAddToReadList: (paper: Paper, targetListId?: string) => void;
    handleRemoveFromReadList: (listId: string, paperId: string) => void;
    isHydrated: boolean;
    isLoggedIn: boolean;
}

export interface UseSearchReturn {
    searchState: SearchState;
    setSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
    activeQuery: string;
    handleSearch: (query: string) => Promise<void>;
    handleLoadMore: () => Promise<void>;
    hasMore: boolean;
    clearSearch: () => void;
}
