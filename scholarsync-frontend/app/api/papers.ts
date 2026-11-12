import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/app/api/client';
import { SearchState, toApiQuery } from '@/app/lib/utils/search';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';
import { AUTOCOMPLETE_STALE_TIME } from '@/app/lib/constants/tanstack.constants';

export function usePaperSearch(state: SearchState) {
  const query = toApiQuery(state);
  return useQuery({
    queryKey: QUERY_KEYS.papers.search(query),
    queryFn: () => unwrap(api.GET('/api/v1/papers/search', { params: { query } })),
    enabled: query.q.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useAutocomplete(q: string) {
  return useQuery({
    queryKey: QUERY_KEYS.papers.autocomplete(q),
    queryFn: () => unwrap(api.GET('/api/v1/papers/autocomplete', { params: { query: { q } } })),
    enabled: q.length >= 2,
    staleTime: AUTOCOMPLETE_STALE_TIME,
    retry: false,
  });
}

export function usePaper(paperId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.papers.detail(paperId),
    queryFn: () => unwrap(api.GET('/api/v1/papers/{paperId}', { params: { path: { paperId } } })),
    retry: false,
  });
}
