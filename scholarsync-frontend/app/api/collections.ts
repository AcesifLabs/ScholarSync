import { QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Schemas, unwrap } from '@/app/api/client';
import { markSavedInCache } from '@/app/api/library';
import { useAuth } from '@/app/lib/providers/AuthProvider';
import { MUTATION_KEYS, QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';
import type { SharedCollectionView } from '@/app/lib/types/collection.types';

const KEYS = QUERY_KEYS.collections;

export function useCollections(archived = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.list(archived),
    queryFn: () => unwrap(api.GET('/api/v1/collections', { params: { query: { archived } } })),
    enabled: !!user,
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => unwrap(api.GET('/api/v1/collections/{id}', { params: { path: { id } } })),
  });
}

export function useSharedCollection(token: string) {
  return useQuery({
    queryKey: KEYS.shared(token),
    queryFn: (): Promise<SharedCollectionView> => unwrap(api.GET('/api/v1/collections/shared/{token}', { params: { path: { token } } })),
    retry: false,
  });
}

/** Refreshes only what a mutation changed. Not awaited: callers navigate in onSuccess without waiting for refetches. */
function useCollectionMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, affected: (args: TArgs) => QueryKey[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: (_data, _error, args) => {
      affected(args).forEach(queryKey => void queryClient.invalidateQueries({ queryKey }));
    },
  });
}

export const useCreateCollection = () => useCollectionMutation((body: { name: string; description?: string }) =>
  unwrap(api.POST('/api/v1/collections', { body })), () => [KEYS.lists]);

export const useUpdateCollection = () => useCollectionMutation(({ id, ...body }: { id: string } & Schemas['CollectionUpdateRequest']) =>
  unwrap(api.PATCH('/api/v1/collections/{id}', { params: { path: { id } }, body })), ({ id }) => [KEYS.lists, KEYS.detail(id)]);

// The deleted collection's own query is left alone: refetching it while its page is still mounted would flash "Not found"
export const useDeleteCollection = () => useCollectionMutation((id: string) =>
  unwrap(api.DELETE('/api/v1/collections/{id}', { params: { path: { id } } })), () => [KEYS.lists]);

/** Adding a paper to a collection also saves it to the library. */
export function useAddToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paperId }: { id: string; paperId: string }) =>
      unwrap(api.POST('/api/v1/collections/{id}/papers', { params: { path: { id } }, body: { paperId } })),
    onSuccess: (_data, { paperId }) => markSavedInCache(queryClient, paperId),
    onSettled: (_data, _error, { id }) => {
      for (const queryKey of [KEYS.lists, KEYS.detail(id), QUERY_KEYS.library.lists]) void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export const useRemoveFromCollection = () => useCollectionMutation(({ id, paperId }: { id: string; paperId: string }) =>
  unwrap(api.DELETE('/api/v1/collections/{id}/papers/{paperId}', { params: { path: { id, paperId } } })),
({ id }) => [KEYS.lists, KEYS.detail(id)]);

/** Writes the returned entry into the cached collection instead of re-downloading the whole collection. */
export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paperId, ...body }: { id: string; paperId: string } & Schemas['CollectionEntryUpdateRequest']) =>
      unwrap(api.PATCH('/api/v1/collections/{id}/papers/{paperId}', { params: { path: { id, paperId } }, body })),
    onSuccess: (entry, { id }) => queryClient.setQueryData<Schemas['CollectionDetail']>(KEYS.detail(id), detail => detail && {
      ...detail,
      entries: detail.entries.map(e => (e.paper.id === entry.paper.id ? entry : e)),
    }),
  });
}

/**
 * Writes the new order into the cache first so the dragged card does not jump back while the request runs. Reorders
 * of one collection share a scope so the PUTs reach the server in order, and only the last to settle refetches.
 */
export function useReorderCollection(id: string) {
  const queryClient = useQueryClient();
  const key = KEYS.detail(id);
  const mutationKey = MUTATION_KEYS.reorderCollection(id);
  return useMutation({
    mutationKey,
    scope: { id: `collection-order-${id}` },
    mutationFn: (paperIds: string[]) =>
      unwrap(api.PUT('/api/v1/collections/{id}/order', { params: { path: { id } }, body: { paperIds } })),
    onMutate: async (paperIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Schemas['CollectionDetail']>(key, previous => {
        if (!previous) return previous;
        const byId = new Map(previous.entries.map(e => [e.paper.id, e]));
        return { ...previous, entries: paperIds.map(pid => byId.get(pid)).filter(e => e !== undefined) };
      });
    },
    // No per-mutation rollback: an older snapshot would also undo later drags. The final refetch restores the server order.
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey }) === 1) await queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export async function downloadExport(id: string, format: 'bibtex' | 'markdown', filename: string) {
  const text = await unwrap(api.GET('/api/v1/collections/{id}/export', {
    params: { path: { id }, query: { format } },
    parseAs: 'text',
  }));
  const url = URL.createObjectURL(new Blob([text as string], { type: 'text/plain' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
