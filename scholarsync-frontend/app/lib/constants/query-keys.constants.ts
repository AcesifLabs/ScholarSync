import type { GraphDirectionParam } from '@/app/lib/constants/graph.constants';

/**
 * Every TanStack Query key in the app. Keys are hierarchical, so invalidating a parent (e.g. `collections.all`)
 * reaches everything below it; cross-module invalidations go through here so a typo can't miss silently.
 */
export const QUERY_KEYS = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  annotations: {
    forPaper: (paperId: string) => ['annotations', paperId] as const,
  },
  authors: {
    search: (q: string, offset: number, limit: number) => ['authors', 'search', q, offset, limit] as const,
    detail: (authorId: string) => ['authors', 'detail', authorId] as const,
    papers: (authorId: string) => ['authors', 'papers', authorId] as const,
  },
  collections: {
    all: ['collections'] as const,
    lists: ['collections', 'list'] as const,
    list: (archived: boolean) => ['collections', 'list', archived] as const,
    detail: (id: string) => ['collections', 'detail', id] as const,
    shared: (token: string) => ['collections', 'shared', token] as const,
  },
  graph: {
    citations: (paperId: string, direction: GraphDirectionParam, depth: number) => ['graph', 'citations', paperId, direction, depth] as const,
    expansion: (paperId: string, direction: GraphDirectionParam) => ['graph', 'expansion', paperId, direction] as const,
  },
  groups: {
    all: ['groups'] as const,
    mine: ['groups', 'mine'] as const,
    myActivity: (limit: number) => ['groups', 'my-activity', limit] as const,
    myActivityAll: ['groups', 'my-activity'] as const,
    /** Prefix of everything about one group. */
    group: (groupId: string) => ['groups', 'group', groupId] as const,
    detail: (groupId: string) => ['groups', 'group', groupId, 'detail'] as const,
    members: (groupId: string) => ['groups', 'group', groupId, 'members'] as const,
    invites: (groupId: string) => ['groups', 'group', groupId, 'invites'] as const,
    papers: (groupId: string) => ['groups', 'group', groupId, 'papers'] as const,
    annotations: (groupId: string, page: number) => ['groups', 'group', groupId, 'annotations', page] as const,
    /** Without a paper id: every loaded thread of the group. */
    comments: (groupId: string, paperId?: string | null) =>
      paperId === undefined ? ['groups', 'group', groupId, 'comments'] : ['groups', 'group', groupId, 'comments', paperId],
    /** Without filters: every loaded activity feed of the group. */
    activity: (groupId: string, filters?: { actorId?: string; paperId?: string }) =>
      filters ? ['groups', 'group', groupId, 'activity', filters] : ['groups', 'group', groupId, 'activity'],
  },
  library: {
    all: ['library'] as const,
    lists: ['library', 'list'] as const,
    list: (query: object) => ['library', 'list', query] as const,
    states: ['library', 'states'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
    latest: ['notifications', 'latest'] as const,
    pagesAll: ['notifications', 'pages'] as const,
    pages: (unreadOnly: boolean) => ['notifications', 'pages', unreadOnly] as const,
  },
  papers: {
    search: (query: object) => ['papers', 'search', query] as const,
    autocomplete: (q: string) => ['papers', 'autocomplete', q] as const,
    detail: (paperId: string) => ['papers', 'detail', paperId] as const,
  },
} as const;

/** Mutation keys used to count in-flight mutations of one kind (see useIsMutating / queryClient.isMutating). */
export const MUTATION_KEYS = {
  library: ['library', 'mutation'] as const,
  reorderCollection: (id: string) => ['collections', 'reorder', id] as const,
} as const;
