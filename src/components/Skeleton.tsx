import React from 'react';

import { SkeletonProps } from '@/types';

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const PaperCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="p-5 flex flex-col flex-grow space-y-4">
            <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-8 w-16" />
        </div>
    </div>
);

export const PaperDetailSkeleton: React.FC = () => (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <div className="flex gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
            </div>
        </div>
        <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
        <div className="flex gap-4 pt-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
        </div>
    </div>
);
