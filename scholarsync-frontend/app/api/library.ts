import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/app/api/client';
import { useAuth } from '@/app/lib/providers/AuthProvider';
import type { LibrarySort, ReadingStatus } from '@/app/lib/constants/library.constants';
import { MUTATION_KEYS, QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';
import { LibraryStateEntry, LibraryStateMap, withRemoved, withSaved, withSavedIfMissing, withUpdated } from '@/app/lib/utils/library';

export type LibraryQuery = {
  status?: ReadingStatus;
  archived?: boolean;
  sort?: LibrarySort;
  page?: number;
  size?: number;
};

/** paperId → state. A plain object (not a Map) so refetches keep unchanged entries' identity (structural sharing). */
/** paperId → state; lastPage is null until the reader saves one (the generated type misses that it is nullable). */
export type LibraryStates = LibraryStateMap;
type LibraryEntryState = LibraryStateEntry;

export function useLibrary(query: LibraryQuery, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.library.list(query),
    queryFn: () => unwrap(api.GET('/api/v1/library', { params: { query } })),
    enabled,
  });
}

/** The signed-in user's state for one paper (undefined when not saved or signed out). Re-renders only when it changes. */
export function useLibraryState(paperId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.library.states,
    queryFn: async (): Promise<LibraryStates> => {
      const rows = await unwrap(api.GET('/api/v1/library/states'));
      return Object.fromEntries(rows.map(row => [row.paperId, row]));
    },
    select: (states: LibraryStates): LibraryEntryState | undefined => states[paperId],
    enabled: !!user,
  });
}

/** Records a paper as saved in the cached states (used when adding it to a collection saves it too). */
export function markSavedInCache(queryClient: QueryClient, paperId: string) {
  queryClient.setQueryData<LibraryStates>(QUERY_KEYS.library.states, states =>
    states && withSavedIfMissing(states, paperId));
}

/** Clients with a failed library mutation whose optimistic state still needs replacing by the server's. */
const statesStale = new WeakSet<QueryClient>();

/**
 * Optimistically patches the states map. Library mutations share a scope so their requests run in order, and only
 * the last one to settle refetches: an earlier refetch would overwrite a later, still-pending optimistic change.
 */
function useLibraryMutation<TArgs>(
  request: (args: TArgs) => Promise<unknown>,
  optimistic: (states: LibraryStates, args: TArgs) => LibraryStates,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MUTATION_KEYS.library,
    scope: { id: 'library' },
    mutationFn: request,
    onMutate: async (args: TArgs) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.library.states });
      queryClient.setQueryData<LibraryStates>(QUERY_KEYS.library.states, states => states && optimistic(states, args));
    },
    onError: () => { statesStale.add(queryClient); },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: MUTATION_KEYS.library }) > 1) return;
      const refetches = [queryClient.invalidateQueries({ queryKey: QUERY_KEYS.library.lists })];
      if (statesStale.delete(queryClient)) refetches.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.library.states }));
      await Promise.all(refetches);
    },
  });
}

export function useSavePaper() {
  return useLibraryMutation(
    (paperId: string) => unwrap(api.PUT('/api/v1/library/{paperId}', { params: { path: { paperId } } })),
    withSaved,
  );
}

export function useRemovePaper() {
  return useLibraryMutation(
    (paperId: string) => unwrap(api.DELETE('/api/v1/library/{paperId}', { params: { path: { paperId } } })),
    withRemoved,
  );
}

export function useUpdateLibraryItem() {
  return useLibraryMutation(
    ({ paperId, ...body }: { paperId: string; status?: ReadingStatus; archived?: boolean }) =>
      unwrap(api.PATCH('/api/v1/library/{paperId}', { params: { path: { paperId } }, body })),
    (states, { paperId, ...patch }) => withUpdated(states, paperId, patch),
  );
}

/**
 * Remembers the PDF page the user stopped on, and can move the paper to In progress in the same request. Not a library mutation: it changes nothing the library lists show
 * until the next visit, so it only marks them stale instead of refetching them on every page turn.
 */
export function useSaveLastPage(paperId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // One at a time, so an older page can't land after a newer one
    scope: { id: `last-page:${paperId}` },
    mutationFn: (body: { lastPage: number; status?: ReadingStatus }) => unwrap(api.PATCH('/api/v1/library/{paperId}', { params: { path: { paperId } }, body })),
    onSuccess: (_, body) => {
      queryClient.setQueryData<LibraryStates>(QUERY_KEYS.library.states, states => states && withUpdated(states, paperId, body));
      // A status change moves the paper between lists, so those refetch; a page change alone just marks them stale
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.library.lists, refetchType: body.status ? 'active' : 'none' });
    },
  });
}
