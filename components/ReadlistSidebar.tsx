import React, { useState } from 'react';
import { Readlist, Paper } from '../types';
import { Library, Plus, Trash2, X, FileText } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface ReadlistSidebarProps {
  readlists: Readlist[];
  activeReadlistId: string | null;
  onSelectReadlist: (id: string | null) => void;
  onCreateReadlist: (name: string) => void;
  onDeleteReadlist: (id: string) => void;
  savedPapers: Record<string, Paper>;
  onRemovePaper: (listId: string, paperId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onStartNewReadlist: () => void;
}

export const ReadlistSidebar: React.FC<ReadlistSidebarProps> = ({
  readlists,
  activeReadlistId,
  onSelectReadlist,
  onCreateReadlist,
  onDeleteReadlist,
  savedPapers,
  onRemovePaper,
  isOpen,
  onClose,
  onStartNewReadlist
}) => {
  const [listIdToDelete, setListIdToDelete] = useState<string | null>(null);
  const activeList = readlists.find(r => r.id === activeReadlistId);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 w-80 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-72 md:h-[calc(100vh-4rem)] md:border-r-0`}>

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Library className="text-scholar-600" size={20} />
            <h2>Your Library</h2>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* List of Readlists */}
        <div className="flex-grow overflow-y-auto p-4 space-y-1">
          {readlists.map(list => (
            <div
              key={list.id}
              onClick={() => onSelectReadlist(list.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${activeReadlistId === list.id ? 'bg-scholar-50 text-scholar-700' : 'hover:bg-slate-100 text-slate-700'
                }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="truncate text-sm font-medium">{list.name}</span>
                <span className="text-xs text-slate-400 bg-white px-1.5 rounded-full border border-slate-100">
                  {list.paperIds.length}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setListIdToDelete(list.id);
                }}
                className={`text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 ${activeReadlistId === list.id ? 'opacity-100' : ''}`}
                title="Delete List"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {readlists.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No readlists yet.
              <br />Start searching to create one.
            </div>
          )}
        </div>

        {/* Content of Selected List (Mini View) */}
        {activeList && activeList.paperIds.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 p-4 max-h-64 overflow-y-auto hidden md:block">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              In {activeList.name}
            </h3>
            <div className="space-y-2">
              {activeList.paperIds.map(paperId => {
                const paper = savedPapers[paperId];
                if (!paper) return null;
                return (
                  <div key={paperId} className="bg-white p-2 rounded border border-slate-100 shadow-sm text-sm group relative">
                    <div className="font-medium text-slate-700 line-clamp-1">{paper.title}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePaper(activeList.id, paperId);
                      }}
                      className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* New Readlist Button */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={onStartNewReadlist}
            className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-slate-300 text-slate-600 hover:border-scholar-500 hover:text-scholar-600 text-sm font-medium py-2.5 rounded-lg transition-all"
          >
            <Plus size={16} />
            New Readlist
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!listIdToDelete}
        title="Delete Readlist?"
        message="Are you sure you want to delete this readlist? This action cannot be undone."
        confirmLabel="Delete List"
        onConfirm={() => listIdToDelete && onDeleteReadlist(listIdToDelete)}
        onCancel={() => setListIdToDelete(null)}
        isDanger={true}
      />
    </>
  );
};