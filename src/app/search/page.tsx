import React, { Suspense } from 'react';
import { fetchPapersServer } from '@/services/paperService.server';
import { SearchResultsContent } from './SearchResultsContent';
import { SearchSkeleton } from '@/components/SearchSkeleton';

async function SearchResultsList({ query }: { query: string }) {
    try {
        const initialResults = await fetchPapersServer(query);
        return <SearchResultsContent initialResults={initialResults} query={query} isLoading={false} />;
    } catch (error) {
        console.error("Error fetching papers:", error);
        return <SearchResultsContent initialResults={[]} query={query} isLoading={false} />;
    }
}

export default async function SearchResults(props: { searchParams: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams;
    const query = searchParams.q || '';

    if (!query) {
        return <SearchResultsContent initialResults={[]} query="" isLoading={false} />;
    }

    return (
        <Suspense fallback={<SearchSkeleton />}>
            <SearchResultsList query={query} />
        </Suspense>
    );
}
