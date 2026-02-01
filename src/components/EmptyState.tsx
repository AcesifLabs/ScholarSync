import React from 'react';
import { Search, Plus } from 'lucide-react';
import { EmptyStateProps } from '@/types';

export const EmptyState: React.FC<EmptyStateProps> = ({ 
    onStartSearching,
    message = "No papers in this list yet."
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 animate-fadeIn">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <Search size={40} className="text-slate-300" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">{message}</h3>
            <p className="text-slate-500 max-w-sm mb-8">
                Start searching for research papers and add them to your collection to build your personal library.
            </p>

            {onStartSearching && (
                <button
                    onClick={onStartSearching}
                    className="flex items-center gap-2 bg-scholar-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-scholar-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <Plus size={20} />
                    <span>Start Searching</span>
                </button>
            )}
        </div>
    );
};
