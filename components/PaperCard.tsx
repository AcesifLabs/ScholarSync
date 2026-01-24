import React, { useState } from 'react';
import { Paper } from '../types';
import { BookOpen, Share2, Plus, Check, ExternalLink, Sparkles, Lightbulb } from 'lucide-react';

interface PaperCardProps {
  paper: Paper;
  onAddToReadlist: (paper: Paper) => void;
  onFindRelated: (paper: Paper) => void;
  isSaved: boolean;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onAddToReadlist, onFindRelated, isSaved }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-4 mb-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${paper.isOpenAccess ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {paper.isOpenAccess ? 'Open Access' : paper.source}
          </span>
          <span className="text-xs text-slate-500 font-medium">{paper.year}</span>
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 leading-tight mb-2 hover:text-scholar-600 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {paper.title}
        </h3>
        
        <p className="text-sm text-slate-500 mb-4 line-clamp-1">
          {paper.authors.join(', ')}
        </p>

        {/* Related Reason Banner */}
        {paper.relatedReason && (
          <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex gap-2.5 items-start">
            <Lightbulb className="text-indigo-600 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-indigo-900 leading-relaxed font-medium">
              <span className="font-bold">Why it's related:</span> {paper.relatedReason}
            </p>
          </div>
        )}

        <div className={`text-sm text-slate-600 mb-4 ${isExpanded ? '' : 'line-clamp-3'}`}>
          {paper.abstract}
        </div>
        
        {paper.abstract.length > 150 && (
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-scholar-600 font-medium mb-4 hover:underline self-start"
            >
                {isExpanded ? 'Show Less' : 'Read Abstract'}
            </button>
        )}
      </div>

      <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex gap-2">
            <button
            onClick={() => window.open(paper.pdfUrl, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-scholar-700 bg-scholar-50 hover:bg-scholar-100 rounded-md transition-colors"
            title="Read Paper"
            >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Read</span>
            </button>

            <button
            onClick={() => onFindRelated(paper)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors"
            title="Find Related Papers"
            >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Related</span>
            </button>
        </div>

        <button
          onClick={() => onAddToReadlist(paper)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isSaved 
              ? 'text-green-700 bg-green-50 cursor-default' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          disabled={isSaved}
        >
          {isSaved ? <Check size={16} /> : <Plus size={16} />}
          <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};