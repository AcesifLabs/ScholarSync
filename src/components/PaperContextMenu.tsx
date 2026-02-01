import React from 'react';
import { Trash2, Sparkles, BookOpen } from 'lucide-react';
import { PaperContextMenuProps } from '@/types';
import { UI_TEXT } from '@/constants/appText';
import { useClickOutside } from '@/hooks/useClickOutside';

export const PaperContextMenu: React.FC<PaperContextMenuProps> = ({
    isOpen,
    position,
    onClose,
    onRemove,
    onView,
    onFindRelatedAction
}) => {
    const menuRef = useClickOutside<HTMLDivElement>(onClose, isOpen);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[180px] animate-fadeIn"
            style={{
                top: position.y,
                left: position.x
            }}
        >
            <button
                onClick={() => {
                    onView();
                    onClose();
                }}
                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
                <BookOpen size={16} className="text-slate-400" />
                <span>{UI_TEXT.READ_PAPER}</span>
            </button>

            <button
                onClick={() => {
                    onFindRelatedAction();
                    onClose();
                }}
                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
                <Sparkles size={16} className="text-slate-400" />
                <span>{UI_TEXT.FIND_RELATED}</span>
            </button>

            <div className="h-px bg-slate-100 my-1" />

            <button
                onClick={() => {
                    onRemove();
                    onClose();
                }}
                className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
                <Trash2 size={16} className="text-red-400" />
                <span>{UI_TEXT.REMOVE_FROM_LIST}</span>
            </button>
        </div>
    );
};
