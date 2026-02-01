'use client';

import React, { useState } from 'react';
import { PaperCardProps } from '@/types';
import { BookOpen, Plus, Check, ExternalLink, Sparkles, Lightbulb, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaperDetailModal } from './PaperDetailModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ContextMenu } from './ContextMenu';
import { UI_TEXT } from '@/constants/appText';

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  onAddToReadListAction,
  onRemoveFromReadList,
  onFindRelatedAction,
  isSaved,
  activeReadListName,
  readLists
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showUnsaveModal, setShowUnsaveModal] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  });
  const router = useRouter();

  const handleReadPaper = () => {
    const url = paper.pdfUrl.toLowerCase();
    const isPotentialPdf = url.endsWith('.pdf') ||
      url.includes('printable') ||
      url.includes('download') ||
      url.includes('article/file');

    if (paper.pdfUrl && (isPotentialPdf || paper.isOpenAccess)) {
      router.push(`/paper/${paper.id}`);
    } else {
      window.open(paper.pdfUrl, '_blank');
    }
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved && onRemoveFromReadList) {
      setShowUnsaveModal(true);
    } else {
      onAddToReadListAction(paper);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const confirmUnsave = () => {
    if (onRemoveFromReadList) {
      onRemoveFromReadList(paper);
    }
    setShowUnsaveModal(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-4 mb-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${paper.isOpenAccess ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {paper.isOpenAccess ? UI_TEXT.OPEN_ACCESS : paper.source}
          </span>
          <span className="text-xs text-slate-500 font-medium">{paper.year}</span>
        </div>

        <h3 className="text-lg font-bold text-slate-800 leading-tight mb-2 hover:text-scholar-600 cursor-pointer transition-colors" onClick={() => setShowModal(true)}>
          {paper.title}
        </h3>

        <p className="text-sm text-slate-500 mb-4 line-clamp-1">
          {paper.authors.join(', ')}
        </p>

        {paper.relatedReason && (
          <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex gap-2.5 items-start">
            <Lightbulb className="text-indigo-600 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-indigo-900 leading-relaxed font-medium">
              <span className="font-bold">Why it's related:</span> {paper.relatedReason}
            </p>
          </div>
        )}

        <div className="text-sm text-slate-600 mb-4 line-clamp-3">
          {paper.abstract}
        </div>

        {paper.abstract.length > 100 && (
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-scholar-600 font-bold mb-4 hover:text-scholar-700 transition-colors self-start flex items-center gap-1"
          >
            Show Details
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={handleReadPaper}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-scholar-700 bg-scholar-50 hover:bg-scholar-100 rounded-md transition-colors"
            title={UI_TEXT.READ_PAPER}
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Read</span>
          </button>

          <button
            onClick={() => onFindRelatedAction(paper)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors"
            title="Find Related Papers"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Related</span>
          </button>
        </div>

        <button
          onClick={handleToggleSave}
          onContextMenu={handleContextMenu}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isSaved
            ? 'text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-600'
            : 'text-slate-600 hover:bg-slate-200'
            }`}
        >
          {isSaved ? <Check size={16} className="group-hover:hidden" /> : <Plus size={16} />}
          {isSaved && <span className="hidden group-hover:inline"><X size={16} /></span>}
          <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <PaperDetailModal
        paper={paper}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAddToReadListAction={onAddToReadListAction}
        onFindRelatedAction={onFindRelatedAction}
        onRead={handleReadPaper}
        isSaved={isSaved}
      />

      <ConfirmationModal
        isOpen={showUnsaveModal}
        title="Remove from Readlist?"
        message={`Do you want to remove this paper from the read list "${activeReadListName || 'your list'}"?`}
        confirmLabel="Remove"
        onConfirm={confirmUnsave}
        onCancel={() => setShowUnsaveModal(false)}
        isDanger={true}
      />

      <ContextMenu
        isOpen={contextMenuState.isOpen}
        position={contextMenuState.position}
        onClose={() => setContextMenuState(prev => ({ ...prev, isOpen: false }))}
        readLists={readLists}
        onSelectReadList={(id) => onAddToReadListAction(paper, id)}
      />
    </div>
  );
};
