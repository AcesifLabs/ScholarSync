import { Paper, ReadingList } from './models';
import React from "react";

export interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
}

export interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    readLists: ReadingList[];
    onSelectReadList: (readListId: string) => void;
}

export interface EmptyStateProps {
    onStartSearching?: () => void;
    message?: string;
}

export interface MainLayoutProps {
    children: React.ReactNode;
    readLists: ReadingList[];
    activeReadListId: string | null;
    setActiveReadListIdAction: (id: string | null) => void;
    handleCreateReadListAction: (name: string) => void;
    handleDeleteReadListAction: (id: string) => void;
    handleRenameReadListAction: (id: string, name: string) => void;
    handleUpdateReadListColorAction: (id: string, color: string) => void;
    savedPapers: Record<string, Paper>;
    handleRemoveFromReadListAction: (listId: string, paperId: string) => void;
    onFindRelatedAction?: (paper: Paper) => void;
    onViewPaper?: (paper: Paper) => void;
    isSidebarOpen: boolean;
    setSidebarOpenAction: (open: boolean) => void;
    showMobileMenuButton?: boolean;
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    onStartNewReadListAction: () => void;
}

export interface PaperCardProps {
  paper: Paper;
  onAddToReadListAction: (paper: Paper, targetListId?: string) => void;
  onRemoveFromReadList?: (paper: Paper) => void;
  onFindRelatedAction: (paper: Paper) => void;
  isSaved: boolean;
  activeReadListName?: string;
  readLists: ReadingList[];
}

export interface PaperDetailModalProps {
  paper: Paper;
  isOpen: boolean;
  onClose: () => void;
  onAddToReadListAction: (paper: Paper) => void;
  onFindRelatedAction: (paper: Paper) => void;
  onRead: (paper: Paper) => void;
  isSaved: boolean;
}

export interface ReadListDetailProps {
    readList: ReadingList;
    savedPapers: Record<string, Paper>;
    onRemoveFromReadList: (paper: Paper) => void;
    onFindRelatedAction: (paper: Paper) => void;
    readLists: ReadingList[];
}

export interface ReadListSidebarProps {
  readLists: ReadingList[];
  activeReadListId: string | null;
  onSelectReadList: (id: string | null) => void;
  onCreateReadList: (name: string) => void;
  onDeleteReadList: (id: string) => void;
  onRenameReadList: (id: string, name: string) => void;
  onUpdateReadListColor: (id: string, color: string) => void;
  savedPapers: Record<string, Paper>;
  onRemovePaper: (listId: string, paperId: string) => void;
  onFindRelatedAction?: (paper: Paper) => void;
  onViewPaper?: (paper: Paper) => void;
  isOpen: boolean;
  onClose: () => void;
  onStartNewReadList: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface SearchBarProps {
    query: string;
    onChange: (value: string) => void;
    onSearch: (e?: React.FormEvent) => void;
    isLoading: boolean;
    isSticky?: boolean;
    isPagination?: boolean;
}

export interface SkeletonProps {
    className?: string;
}

export interface ReadListContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onRename: () => void;
    onSetColor: (color: string) => void;
    onDelete: () => void;
    canDelete: boolean;
}

export interface PaperContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onRemove: () => void;
    onView: () => void;
    onFindRelatedAction: () => void;
}
