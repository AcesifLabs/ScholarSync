import React from 'react';
import { ReadListDetailProps } from '@/types';
import { PaperCard } from './PaperCard';
import { EmptyState } from './EmptyState';
import { UI_TEXT } from '@/constants/appText';

export const ReadListDetail: React.FC<ReadListDetailProps> = ({
    readList,
    savedPapers,
    onFindRelatedAction,
    onBackToSearch,
    onRemoveFromReadList,
    readLists
}) => {
    const papersInList = readList.paperIds.map(id => savedPapers[id]).filter(Boolean);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{readList.name}</h2>
                    <p className="text-slate-500">{UI_TEXT.PAPERS_SAVED(papersInList.length)}</p>
                </div>
                <button
                    onClick={onBackToSearch}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-scholar-50 text-scholar-700 font-bold rounded-xl hover:bg-scholar-100 transition-all border border-scholar-200"
                >
                    {UI_TEXT.BACK_TO_SEARCH}
                </button>
            </div>

            {papersInList.length === 0 ? (
                <EmptyState onStartSearching={onBackToSearch} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {papersInList.map((paper, index) => (
                        <PaperCard
                            key={`${paper.id}-${index}`}
                            paper={paper}
                            onAddToReadListAction={() => { }}
                            onRemoveFromReadList={onRemoveFromReadList}
                            onFindRelatedAction={onFindRelatedAction}
                            isSaved={true}
                            readLists={readLists}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
