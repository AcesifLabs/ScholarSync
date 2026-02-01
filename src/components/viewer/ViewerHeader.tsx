import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { ViewerHeaderProps } from '@/types';

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({ title, authors, year, pdfUrl, onBack }) => {
    return (
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shrink-0"
                    title="Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="min-w-0">
                    <h1 className="text-sm md:text-base font-bold text-slate-800 truncate leading-tight">
                        {title}
                    </h1>
                    <p className="text-xs text-slate-500 truncate">
                        {authors.join(', ')} • {year}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
                <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    title="Open in new window"
                >
                    <ExternalLink size={14} />
                    <span>External</span>
                </a>
            </div>
        </header>
    );
};
