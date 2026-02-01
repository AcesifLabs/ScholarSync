import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ContextMenuProps } from '@/types';
import { useClickOutside } from '@/hooks/useClickOutside';

export const ContextMenu: React.FC<ContextMenuProps> = ({
    isOpen,
    position,
    onClose,
    readLists,
    onSelectReadList
}) => {
    const menuRef = useClickOutside<HTMLDivElement>(onClose, isOpen);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px]"
            style={{
                top: position.y,
                left: position.x
            }}
        >
            <div className="relative group">
                <button className="w-full px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between">
                    <span>Add to reading list</span>
                    <ChevronRight size={14} className="text-slate-400" />
                </button>

                {/* Submenu */}
                <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px] hidden group-hover:block">
                    {readLists.map(list => (
                        <button
                            key={list.id}
                            onClick={() => {
                                onSelectReadList(list.id);
                                onClose();
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 hover:text-scholar-600 truncate"
                        >
                            {list.name}
                        </button>
                    ))}
                    {readLists.length === 0 && (
                        <div className="px-4 py-2 text-xs text-slate-400 italic">
                            No reading list
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
