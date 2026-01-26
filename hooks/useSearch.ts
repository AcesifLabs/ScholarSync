import { useState, useCallback, useRef, useEffect } from 'react';
import { useLazySearchPapersQuery } from '../services/paperApi';
import { SearchState } from '../types';

export const useSearch = () => {
    const [trigger] = useLazySearchPapersQuery();

    const [searchState, setSearchState] = useState<SearchState>(() => {
        const saved = localStorage.getItem('scholar_search_state');
        return saved ? JSON.parse(saved) : {
            isLoading: false,
            results: [],
            error: null,
            query: ''
        };
    });

    const [activeQuery, setActiveQuery] = useState(() => {
        return localStorage.getItem('scholar_active_query') || '';
    });

    const [page, setPage] = useState(() => {
        const saved = localStorage.getItem('scholar_page');
        return saved ? parseInt(saved, 10) : 1;
    });

    const [hasMore, setHasMore] = useState(() => {
        const saved = localStorage.getItem('scholar_has_more');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const lastRequestTime = useRef<number>(0);

    useEffect(() => {
        localStorage.setItem('scholar_search_state', JSON.stringify({ ...searchState, isLoading: false }));
    }, [searchState]);

    useEffect(() => {
        localStorage.setItem('scholar_active_query', activeQuery);
    }, [activeQuery]);

    useEffect(() => {
        localStorage.setItem('scholar_page', page.toString());
    }, [page]);

    useEffect(() => {
        localStorage.setItem('scholar_has_more', JSON.stringify(hasMore));
    }, [hasMore]);

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

    return {
        searchState,
        setSearchState,
        activeQuery,
        handleSearch,
        handleLoadMore,
        hasMore
    };
};
