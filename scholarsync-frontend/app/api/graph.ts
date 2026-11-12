import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, unwrap } from '@/app/api/client';
import type { GraphDirectionParam } from '@/app/lib/constants/graph.constants';
import { GRAPH_EXPAND_LIMIT } from '@/app/lib/constants/pagination.constants';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';
import { GRAPH_STALE_TIME } from '@/app/lib/constants/tanstack.constants';

export function useCitationGraph(paperId: string, direction: GraphDirectionParam, depth: number) {
  return useQuery({
    queryKey: QUERY_KEYS.graph.citations(paperId, direction, depth),
    queryFn: () => unwrap(api.GET('/api/v1/papers/{paperId}/graph', {
      params: { path: { paperId }, query: { direction, depth } },
    })),
    staleTime: GRAPH_STALE_TIME,
    retry: false,
  });
}

/** Imperative node expansion, cached like a query so re-expanding a node (or toggling back) doesn't refetch. */
export function useFetchExpansion() {
  const queryClient = useQueryClient();
  return useCallback((paperId: string, direction: GraphDirectionParam) => queryClient.fetchQuery({
    queryKey: QUERY_KEYS.graph.expansion(paperId, direction),
    queryFn: () => unwrap(api.GET('/api/v1/papers/{paperId}/graph/expand', {
      params: { path: { paperId }, query: { direction, limit: GRAPH_EXPAND_LIMIT } },
    })),
    staleTime: GRAPH_STALE_TIME,
    retry: false,
  }), [queryClient]);
}
