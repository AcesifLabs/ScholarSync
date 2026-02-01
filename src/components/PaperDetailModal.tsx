import React, { useEffect } from 'react';
import { X, BookOpen, Sparkles, Plus, Check, Calendar, Users, Building2 } from 'lucide-react';
import { Paper } from '@/types';

interface PaperDetailModalProps {
    paper: Paper;
    isOpen: boolean;
    onClose: () => void;
    onAddToReadList: (paper: Paper) => void;
    onFindRelated: (paper: Paper) => void;
    onRead: (paper: Paper) => void;
    isSaved: boolean;
}

export const PaperDetailModal: React.FC<PaperDetailModalProps> = ({
    paper,
    isOpen,
    onClose,
    onAddToReadList,
    onFindRelated,
    onRead,
    isSaved
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modalSlideUp">
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div className="space-y-1 pr-8">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${paper.isOpenAccess ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                                {paper.isOpenAccess ? 'Open Access' : paper.source}
                            </span>
                            {paper.year !== 'n.d.' && (
                                <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                    <Calendar size={12} />
                                    {paper.year}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                            {paper.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:shadow-md rounded-full text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Users size={16} />
                                Authors
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {paper.authors.map((author, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium">
                                        {author}
                                    </span>
                                ))}
                                {paper.authors.length === 0 && (
                                    <span className="text-slate-400 text-sm italic">Unknown authors</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={16} />
                                Publisher / Venue
                            </h3>
                            <p className="text-slate-700 font-semibold bg-scholar-50 text-scholar-700 px-3 py-1 rounded-lg inline-block">
                                {paper.source}
                            </p>
                        </div>
                    </div>

                    {/* Abstract */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Abstract</h3>
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 italic text-slate-700 leading-relaxed text-lg">
                            {paper.abstract}
                        </div>
                    </div>

                    {/* Related Reason (if available) */}
                    {paper.relatedReason && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex gap-4 items-start">
                            <div className="bg-indigo-100 p-2 rounded-xl">
                                <Sparkles className="text-indigo-600" size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-indigo-900">Why it's related</h4>
                                <p className="text-indigo-800/80 leading-relaxed">
                                    {paper.relatedReason}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => onRead(paper)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-scholar-600 text-white rounded-xl font-bold hover:bg-scholar-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <BookOpen size={18} />
                            Read Paper
                        </button>
                        <button
                            onClick={() => onFindRelated(paper)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                        >
                            <Sparkles size={18} className="text-violet-500" />
                            Find Related
                        </button>
                    </div>

                    <button
                        onClick={() => !isSaved && onAddToReadList(paper)}
                        disabled={isSaved}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${isSaved
                                ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                    >
                        {isSaved ? <Check size={18} /> : <Plus size={18} />}
                        {isSaved ? 'Saved to Library' : 'Save to Library'}
                    </button>
                </div>
            </div>
        </div>
    );
};
