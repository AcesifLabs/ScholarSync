import React, { useEffect, useRef } from 'react';
import { Edit2, Palette, ChevronRight, Trash2 } from 'lucide-react';

interface ReadListContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onRename: () => void;
    onSetColor: (color: string) => void;
    onDelete: () => void;
    canDelete: boolean;
}

const PRESET_COLORS = [
    '#f87171', // red-400
    '#fb923c', // orange-400
    '#fbbf24', // amber-400
    '#facc15', // yellow-400
    '#a3e635', // lime-400
    '#4ade80', // green-400
    '#34d399', // emerald-400
    '#2dd4bf', // teal-400
    '#22d3ee', // cyan-400
    '#38bdf8', // sky-400
    '#60a5fa', // blue-400
    '#818cf8', // indigo-400
    '#a78bfa', // violet-400
    '#c084fc', // purple-400
    '#e879f9', // fuchsia-400
    '#f472b6', // pink-400
    '#fb7185', // rose-400
    '#94a3b8', // slate-400
];

export const ReadListContextMenu: React.FC<ReadListContextMenuProps> = ({
    isOpen,
    position,
    onClose,
    onRename,
    onSetColor,
    onDelete,
    canDelete
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
                    onRename();
                    onClose();
                }}
                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
                <Edit2 size={16} className="text-slate-400" />
                <span>Rename List</span>
            </button>

            <div className="relative group">
                <button className="w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3">
                        <Palette size={16} className="text-slate-400" />
                        <span>Change Color</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                </button>

                {/* Bridge to prevent menu from closing when moving mouse to submenu */}
                <div className="absolute top-0 right-[-10px] w-[10px] h-full z-10 hidden group-hover:block" />

                {/* Color Palette Submenu */}
                <div className="absolute left-full top-0 bg-white rounded-lg shadow-xl border border-slate-200 p-2 hidden group-hover:block w-[180px] z-20">
                    <div className="grid grid-cols-6 gap-1.5">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => {
                                    onSetColor(color);
                                    onClose();
                                }}
                                className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform shadow-sm"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                        <button
                            onClick={() => {
                                onSetColor('');
                                onClose();
                            }}
                            className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform flex items-center justify-center bg-white"
                            title="Default Color"
                        >
                            <div className="w-full h-px bg-red-400 rotate-45" />
                        </button>
                    </div>
                </div>
            </div>

            {canDelete && (
                <>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                        className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                        <Trash2 size={16} className="text-red-400" />
                        <span>Delete List</span>
                    </button>
                </>
            )}
        </div>
    );
};

