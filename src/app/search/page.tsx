import React, { Suspense } from 'react';
import { fetchPapersServer } from '@/services/paperService.server';
import { Paper } from '@/types';
import { SearchResultsContent } from './SearchResultsContent';
import { SearchSkeleton } from '@/components/SearchSkeleton';

export default async function SearchResults(props: { searchParams: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams;
    const query = searchParams.q || '';
    let initialResults: Paper[] = [];

    if (query) {
        initialResults = await fetchPapersServer(query);
    }

    return (
        <Suspense fallback={<SearchSkeleton />}>
            <SearchResultsContent initialResults={initialResults} query={query} />
        </Suspense>
    );
}
