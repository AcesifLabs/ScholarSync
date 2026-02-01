import React from 'react';
import { GraduationCap } from 'lucide-react';
import { Skeleton, PaperCardSkeleton } from './Skeleton';

export const SearchSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 mr-4">
                        <GraduationCap className="text-slate-300" size={24} />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="relative flex-1 max-w-2xl">
                        <Skeleton className="h-12 w-full rounded-2xl" />
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
                <Skeleton className="h-5 w-48" />

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <PaperCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
};
