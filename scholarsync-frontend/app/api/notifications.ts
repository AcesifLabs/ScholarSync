import { InfiniteData, QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Schemas, unwrap } from '@/app/api/client';
import { useAuth } from '@/app/lib/providers/AuthProvider';
import { NOTIFICATION_MENU_LIMIT, PAGE_SIZE } from '@/app/lib/constants/pagination.constants';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';

type Notification = Schemas['NotificationResponse'];

/** ADR 0004: the bell polls instead of holding a socket open. */
const POLL_MS = 60_000;

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.notifications.unread,
    queryFn: () => unwrap(api.GET('/api/v1/notifications/unread-count')),
    enabled: !!user,
    refetchInterval: POLL_MS,
  });
}

export function useLatestNotifications(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.notifications.latest,
    queryFn: () => unwrap(api.GET('/api/v1/notifications', { params: { query: { limit: NOTIFICATION_MENU_LIMIT } } })),
    enabled,
  });
}

export function useNotificationPages(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.notifications.pages(unreadOnly),
    queryFn: ({ pageParam }) => unwrap(api.GET('/api/v1/notifications', {
      params: { query: { unreadOnly, before: pageParam, limit: PAGE_SIZE } },
    })),
    initialPageParam: undefined as string | undefined,
    // shortcut: the backend filters createdAt < before, so notifications sharing the last item's exact timestamp
    // across a page boundary are skipped (rare at Instant precision); fix with an (createdAt, id) cursor server-side.
    getNextPageParam: last => (last.length === PAGE_SIZE ? last[last.length - 1].createdAt : undefined),
  });
}

/** Marks notifications read in every loaded list and lowers the unread badge, instead of refetching all pages. */
function markReadInCache(queryClient: QueryClient, isTarget: (n: Notification) => boolean) {
  const mark = (list: Notification[]) => list.map(n => (isTarget(n) && !n.read ? { ...n, read: true } : n));
  queryClient.setQueriesData<Notification[]>({ queryKey: QUERY_KEYS.notifications.latest }, list => list && mark(list));
  queryClient.setQueriesData<InfiniteData<Notification[]>>({ queryKey: QUERY_KEYS.notifications.pagesAll },
    data => data && { ...data, pages: data.pages.map(mark) });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.POST('/api/v1/notifications/{id}/read', { params: { path: { id } } })),
    onSuccess: (_data, id) => {
      markReadInCache(queryClient, n => n.id === id);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unread });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/v1/notifications/read-all')),
    onSuccess: () => {
      markReadInCache(queryClient, () => true);
      queryClient.setQueryData<Schemas['UnreadCount']>(QUERY_KEYS.notifications.unread, { count: 0 });
    },
  });
}
