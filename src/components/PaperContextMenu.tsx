import React, { useEffect, useRef } from 'react';
import { Trash2, ExternalLink, Sparkles, BookOpen } from 'lucide-react';

interface PaperContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onRemove: () => void;
    onView: () => void;
    onFindRelated: () => void;
}

export const PaperContextMenu: React.FC<PaperContextMenuProps> = ({
    isOpen,
    position,
    onClose,
    onRemove,
    onView,
    onFindRelated
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

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
                <span>Read Paper</span>
            </button>

            <button
                onClick={() => {
                    onFindRelated();
                    onClose();
                }}
                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
                <Sparkles size={16} className="text-slate-400" />
                <span>Find Related</span>
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
                <span>Remove from List</span>
            </button>
        </div>
    );
};
