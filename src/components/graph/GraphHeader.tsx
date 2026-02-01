import React from 'react';
import { ArrowLeft, GraduationCap } from 'lucide-react';

interface GraphHeaderProps {
    nodeCount: number;
    onBack: () => void;
}

export const GraphHeader: React.FC<GraphHeaderProps> = ({ nodeCount, onBack }) => {
    return (
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                    title="Back to Search"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <GraduationCap className="text-scholar-600" size={28} />
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Research Graph</h1>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-slate-800">{nodeCount} Papers Found</span>
                    <span className="text-xs text-slate-500">Drag to pan • Scroll to zoom • Click "Related" to build</span>
                </div>
            </div>
        </header>
    );
};
