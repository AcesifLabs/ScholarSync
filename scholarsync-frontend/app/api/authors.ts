import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/app/api/client';
import { PAGE_SIZE } from '@/app/lib/constants/pagination.constants';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';

export function useAuthorSearch(q: string, offset: number, limit = PAGE_SIZE) {
  return useQuery({
    queryKey: QUERY_KEYS.authors.search(q, offset, limit),
    queryFn: () => unwrap(api.GET('/api/v1/authors/search', { params: { query: { q, offset, limit } } })),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useAuthor(authorId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.authors.detail(authorId),
    queryFn: () => unwrap(api.GET('/api/v1/authors/{authorId}', { params: { path: { authorId } } })),
    retry: false,
  });
}

export function useAuthorPapers(authorId: string, limit = PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.authors.papers(authorId),
    queryFn: ({ pageParam }) => unwrap(api.GET('/api/v1/authors/{authorId}/papers', {
      params: { path: { authorId }, query: { offset: pageParam, limit } },
    })),
    initialPageParam: 0,
    getNextPageParam: last => last.next ?? undefined,
    retry: false,
  });
}
