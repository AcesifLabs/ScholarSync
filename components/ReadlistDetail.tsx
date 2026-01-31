import React from 'react';
import { Paper, Readlist } from '../types';
import { PaperCard } from './PaperCard';
import { EmptyState } from './EmptyState';

interface ReadlistDetailProps {
    readlist: Readlist;
    savedPapers: Record<string, Paper>;
    onFindRelated: (paper: Paper) => void;
    onBackToSearch: () => void;
    onRemoveFromReadlist: (paper: Paper) => void;
}

export const ReadlistDetail: React.FC<ReadlistDetailProps> = ({
    readlist,
    savedPapers,
    onFindRelated,
    onBackToSearch,
    onRemoveFromReadlist
}) => {
    const papersInList = readlist.paperIds.map(id => savedPapers[id]).filter(Boolean);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{readlist.name}</h2>
                    <p className="text-slate-500">{papersInList.length} papers saved</p>
                </div>
            </div>

            {papersInList.length === 0 ? (
                <EmptyState onStartSearching={onBackToSearch} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {papersInList.map(paper => (
                        <PaperCard
                            key={paper.id}
                            paper={paper}
                            onAddToReadlist={() => { }}
                            onRemoveFromReadlist={onRemoveFromReadlist}
                            onFindRelated={onFindRelated}
                            isSaved={true}
                            activeReadlistName={readlist.name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
