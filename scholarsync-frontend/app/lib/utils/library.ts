import { ALL_OPTION } from '@/app/lib/constants/filters.constants';
import { DEFAULT_READING_STATUS, LIBRARY_SORT_OPTIONS, LibrarySort, READING_STATUSES, ReadingStatus } from '@/app/lib/constants/library.constants';

export type LibraryView = { tab: ReadingStatus | typeof ALL_OPTION; sort: LibrarySort; page: number };

/** Library tab, sort and 0-based page from the URL; anything unknown falls back to the default. */
export function parseLibraryParams(params: URLSearchParams): LibraryView {
  const tab = params.get('status');
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  return {
    tab: READING_STATUSES.some(s => s.value === tab) ? (tab as ReadingStatus) : ALL_OPTION,
    sort: LIBRARY_SORT_OPTIONS.some(o => o.value === sort) ? (sort as LibrarySort) : 'added',
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  };
}

/** URL query for a library view, omitting defaults; the page is 1-based in the URL. */
export function libraryParams(view: LibraryView): string {
  const params = new URLSearchParams();
  if (view.tab !== ALL_OPTION) params.set('status', view.tab);
  if (view.sort !== 'added') params.set('sort', view.sort);
  if (view.page > 0) params.set('page', String(view.page + 1));
  return params.toString();
}

/** One paper's entry in the cached library states (lastPage is null until the reader saves one). */
export type LibraryStateEntry = { paperId: string; status: ReadingStatus; archived: boolean; lastPage?: number | null };
export type LibraryStateMap = Record<string, LibraryStateEntry>;

/** Saved (or restored from the archive): keeps the status and last page it had; new papers start as To read. */
export function withSaved(states: LibraryStateMap, paperId: string): LibraryStateMap {
  const current = states[paperId];
  return { ...states, [paperId]: { paperId, status: current?.status ?? DEFAULT_READING_STATUS, lastPage: current?.lastPage ?? null, archived: false } };
}

/** Added only if missing (adding to a collection saves the paper but must not restore an archived one's status). */
export function withSavedIfMissing(states: LibraryStateMap, paperId: string): LibraryStateMap {
  return states[paperId] ? states : withSaved(states, paperId);
}

export function withRemoved(states: LibraryStateMap, paperId: string): LibraryStateMap {
  if (!states[paperId]) return states;
  const next = { ...states };
  delete next[paperId];
  return next;
}

/** Applies the given fields to a saved paper; unknown papers and undefined fields are left as they are. */
export function withUpdated(states: LibraryStateMap, paperId: string, patch: { status?: ReadingStatus; archived?: boolean; lastPage?: number }): LibraryStateMap {
  const current = states[paperId];
  if (!current) return states;
  return {
    ...states,
    [paperId]: {
      ...current,
      status: patch.status ?? current.status,
      archived: patch.archived ?? current.archived,
      lastPage: patch.lastPage ?? current.lastPage,
    },
  };
}
