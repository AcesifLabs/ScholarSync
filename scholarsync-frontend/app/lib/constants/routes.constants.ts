import type { GroupTab } from '@/app/lib/constants/group.constants';

const enc = encodeURIComponent;

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** App routes. Builders encode ids once, so callers pass raw ids. */
export const ROUTES = {
  home: '/',
  search: '/search',
  searchFor: (q: string) => withQuery('/search', new URLSearchParams({ q })),
  researchers: '/researchers',
  /** `page` is zero-based and omitted for the first page. */
  researcherSearch: (q: string, page = 0) => withQuery('/researchers', new URLSearchParams(page ? { q, page: String(page) } : { q })),
  researcher: (id: string) => `/researchers/${enc(id)}`,
  library: '/library',
  collections: '/collection',
  collection: (id: string) => `/collection/${enc(id)}`,
  sharedCollection: (token: string) => `/shared/${enc(token)}`,
  groups: '/groups',
  group: (id: string, view: { tab?: GroupTab; paper?: string } = {}) => {
    const params = new URLSearchParams();
    if (view.tab) params.set('tab', view.tab);
    if (view.paper) params.set('paper', view.paper);
    return withQuery(`/groups/${enc(id)}`, params);
  },
  joinGroup: (token: string) => `/groups/join/${enc(token)}`,
  archive: '/archive',
  notifications: '/notifications',
  authError: '/auth/error',
  /** `from` names the page the paper was opened from, so its back link can return there. */
  paper: (id: string, from?: string) => withQuery(`/paper/${enc(id)}`, new URLSearchParams(from ? { from } : {})),
  /** Opens the reader at a page, or at an annotation (which wins). */
  paperRead: (id: string, at: { page?: number; annotation?: string } = {}) => {
    const params = new URLSearchParams();
    if (at.annotation) params.set('annotation', at.annotation);
    else if (at.page && at.page > 1) params.set('page', String(at.page));
    return withQuery(`/paper/${enc(id)}/read`, params);
  },
  paperGraph: (id: string) => `/paper/${enc(id)}/graph`,
} as const;

/** Sections that need a signed-in user, including everything below them. */
export const PROTECTED_PATHS: readonly string[] = [ROUTES.library, ROUTES.collections, ROUTES.groups, ROUTES.archive, ROUTES.notifications];

// The PDF reader is private even though the paper page itself is public
export const PROTECTED_PATTERNS = [/^\/paper\/[^/]+\/read(\/|$)/];
