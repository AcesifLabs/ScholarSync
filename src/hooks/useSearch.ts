import { useState, useCallback, useRef, useEffect } from 'react';
import { useLazySearchPapersQuery } from '@/services/paperApi';
import { SearchState, Paper, UseSearchReturn } from '@/types';

export const useSearch = (initialResults?: Paper[], initialQuery?: string): UseSearchReturn => {
    const [trigger] = useLazySearchPapersQuery();

    const [searchState, setSearchState] = useState<SearchState>({
        isLoading: false,
        results: initialResults || [],
        error: null,
        query: initialQuery || ''
    });

    const [activeQuery, setActiveQuery] = useState(initialQuery || '');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (initialResults) {
                setSearchState(prev => ({
                    ...prev,
                    results: initialResults,
                    query: initialQuery || '',
                    isLoading: false,
                    error: null
                }));
                setActiveQuery(initialQuery || '');
                setPage(1);
                setHasMore(true);
            }
        }
    }, [initialResults, initialQuery]);

    const lastRequestTime = useRef<number>(0);

    const handleSearch = useCallback(async (query: string) => {
        const queryToUse = query.trim();
        if (!queryToUse) return;

        setActiveQuery(queryToUse);
        setPage(1);
        setHasMore(true);
        setSearchState(prev => ({ ...prev, query: queryToUse, isLoading: true, error: null, results: [] }));

        try {
            const { papers } = await trigger({ query: queryToUse, page: 1 }).unwrap();

            if (papers.length === 0) {
                setSearchState(prev => ({ ...prev, isLoading: false, results: [], error: activeQuery ? null : "No papers found." }));
            } else {
                setSearchState(prev => ({ ...prev, isLoading: false, results: papers }));
            }
        } catch (err) {
            console.error("Search failed:", err);
            setSearchState(prev => ({ ...prev, isLoading: false, error: "Failed to fetch papers." }));
        }
    }, [trigger, activeQuery]);

    const handleLoadMore = useCallback(async () => {
        if (searchState.isLoading || !hasMore || !activeQuery) return;

        const nextPage = page + 1;
        setPage(nextPage);
        setSearchState(prev => ({ ...prev, isLoading: true }));

        try {
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime.current;
            const delay = Math.max(0, 1000 - timeSinceLastRequest);

            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const { papers } = await trigger({ query: activeQuery, page: nextPage }).unwrap();
            lastRequestTime.current = Date.now();

            if (papers.length === 0) {
                setHasMore(false);
                setSearchState(prev => ({ ...prev, isLoading: false }));
            } else {
                setSearchState(prev => ({
                    ...prev,
                    isLoading: false,
                    results: [...prev.results, ...papers]
                }));
            }
        } catch (err) {
            setSearchState(prev => ({ ...prev, isLoading: false }));
            console.error("Failed to load more papers:", err);
        }
    }, [searchState.isLoading, hasMore, activeQuery, page, trigger]);

    const clearSearch = useCallback(() => {
        setActiveQuery('');
        setPage(1);
        setHasMore(true);
        setSearchState({
            isLoading: false,
            results: [],
            error: null,
            query: ''
        });
    }, []);

    return {
        searchState,
        setSearchState,
        activeQuery,
        handleSearch,
        handleLoadMore,
        hasMore,
        clearSearch
    };
};
