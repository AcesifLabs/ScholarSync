'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ReadListSidebarProps } from '@/types';
import { Library, Plus, X, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { ReadListContextMenu } from './ReadListContextMenu';
import { PaperContextMenu } from './PaperContextMenu';
import { UI_TEXT } from '@/constants/appText';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export const ReadListSidebar: React.FC<ReadListSidebarProps> = ({
  readLists,
  activeReadListId,
  onSelectReadList,
  onDeleteReadList,
  onRenameReadList,
  onUpdateReadListColor,
  savedPapers,
  onRemovePaper,
  onFindRelatedAction,
  onViewPaper,
  isOpen,
  onClose,
  onStartNewReadList,
  isCollapsed = false,
  onToggleCollapse
}) => {
  useBodyScrollLock(isOpen);

  const [listIdToDelete, setListIdToDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    listId: string | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    listId: null
  });

  const [paperContextMenu, setPaperContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    paperId: string | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    paperId: null
  });

  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeList = readLists.find(r => r.id === activeReadListId);

  useEffect(() => {
    if (renamingListId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingListId]);

  const handleContextMenu = (e: React.MouseEvent, listId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      listId
    });
  };

  const handlePaperContextMenu = (e: React.MouseEvent, paperId: string) => {
    e.preventDefault();
    setPaperContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      paperId
    });
  };

  const handleRenameSubmit = (id: string) => {
    if (newName.trim()) {
      onRenameReadList(id, newName.trim());
    }
    setRenamingListId(null);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 z-50 transform transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static ${isCollapsed ? 'md:w-16 w-16' : 'md:w-72 w-80'} md:h-[calc(100vh-4rem)] md:border-r-0`}>

        <div className={`p-4 border-b border-slate-100 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center bg-slate-50 overflow-hidden`}>
          <div className="flex items-center gap-2 text-slate-800 font-semibold overflow-hidden">
            <Library className="text-scholar-600 flex-shrink-0" size={20} />
            {!isCollapsed && <h2 className="truncate">{UI_TEXT.YOUR_LIBRARY}</h2>}
          </div>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button 
                onClick={onToggleCollapse} 
                className="hidden md:flex text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {readLists.map(list => (
            <div
              key={list.id}
              onClick={() => onSelectReadList(list.id)}
              onContextMenu={(e) => handleContextMenu(e, list.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${activeReadListId === list.id ? 'bg-scholar-50 text-scholar-700' : 'hover:bg-slate-100 text-slate-700'
                } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? list.name : ''}
            >
              <div className={`flex items-center gap-3 overflow-hidden flex-1 ${isCollapsed ? 'justify-center' : ''}`}>
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: list.color || '#cbd5e1' }}
                />
                {!isCollapsed && (
                  <>
                    {renamingListId === list.id ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => handleRenameSubmit(list.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(list.id);
                          if (e.key === 'Escape') setRenamingListId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-white border border-scholar-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-scholar-500/20"
                      />
                    ) : (
                      <span className="truncate text-sm font-medium flex-1">{list.name}</span>
                    )}
                    <span className="text-xs text-slate-400 bg-white px-1.5 rounded-full border border-slate-100">
                      {list.paperIds.length}
                    </span>
                  </>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, list.id);
                    }}
                    className={`text-slate-400 hover:text-slate-600 transition-opacity p-1 ${activeReadListId === list.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {readLists.length === 0 && !isCollapsed && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No readlists yet.
              <br />Start searching to create one.
            </div>
          )}
        </div>

        {activeList && activeList.paperIds.length > 0 && !isCollapsed && (
          <div className="border-t border-slate-100 bg-slate-50 p-4 max-h-64 overflow-y-auto hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: activeList.color || '#cbd5e1' }}
              />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                In {activeList.name}
              </h3>
            </div>
            <div className="space-y-2">
              {activeList.paperIds.map(paperId => {
                const paper = savedPapers[paperId];
                if (!paper) return null;
                return (
                  <div 
                    key={paperId} 
                    className="bg-white p-2 rounded border border-slate-100 shadow-sm text-sm group relative cursor-pointer hover:border-scholar-200 transition-colors"
                    onClick={() => onViewPaper && onViewPaper(paper)}
                    onContextMenu={(e) => handlePaperContextMenu(e, paperId)}
                  >
                    <div className="font-medium text-slate-700 line-clamp-1 pr-5">{paper.title}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePaperContextMenu(e, paperId);
                      }}
                      className="absolute top-2 right-1.5 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={onStartNewReadList}
            className={`w-full flex items-center justify-center gap-2 bg-white border border-dashed border-slate-300 text-slate-600 hover:border-scholar-500 hover:text-scholar-600 text-sm font-medium py-2.5 rounded-lg transition-all ${isCollapsed ? 'px-0' : ''}`}
            title={isCollapsed ? UI_TEXT.NEW_READLIST : ""}
          >
            <Plus size={16} />
            {!isCollapsed && <span>{UI_TEXT.NEW_READLIST}</span>}
          </button>
        </div>
      </div>

      <ReadListContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onRename={() => {
          const list = readLists.find(l => l.id === contextMenu.listId);
          if (list) {
            setRenamingListId(list.id);
            setNewName(list.name);
          }
        }}
        onSetColor={(color) => {
          if (contextMenu.listId) {
            onUpdateReadListColor(contextMenu.listId, color);
          }
        }}
        onDelete={() => {
          if (contextMenu.listId) {
            setListIdToDelete(contextMenu.listId);
          }
        }}
        canDelete={readLists.length > 1}
      />

      <PaperContextMenu
        isOpen={paperContextMenu.isOpen}
        position={paperContextMenu.position}
        onClose={() => setPaperContextMenu(prev => ({ ...prev, isOpen: false }))}
        onRemove={() => {
          if (paperContextMenu.paperId && activeReadListId) {
            onRemovePaper(activeReadListId, paperContextMenu.paperId);
          }
        }}
        onView={() => {
          if (paperContextMenu.paperId && onViewPaper) {
            const paper = savedPapers[paperContextMenu.paperId];
            if (paper) onViewPaper(paper);
          }
        }}
        onFindRelatedAction={() => {
          if (paperContextMenu.paperId && onFindRelatedAction) {
            const paper = savedPapers[paperContextMenu.paperId];
            if (paper) onFindRelatedAction(paper);
          }
        }}
      />

      <ConfirmationModal
        isOpen={!!listIdToDelete}
        title={UI_TEXT.DELETE_LIST_CONFIRM_TITLE}
        message={UI_TEXT.DELETE_LIST_CONFIRM_MESSAGE}
        confirmLabel={UI_TEXT.DELETE_LIST}
        onConfirm={() => listIdToDelete && onDeleteReadList(listIdToDelete)}
        onCancel={() => setListIdToDelete(null)}
        isDanger={true}
      />
    </>
  );
};
