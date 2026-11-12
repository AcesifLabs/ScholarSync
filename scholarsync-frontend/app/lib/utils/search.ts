import { MAX_RESULTS, MAX_YEAR, MIN_YEAR, SearchSort, SORTS } from '@/app/lib/constants/search.constants';
import { PAGE_SIZE } from '@/app/lib/constants/pagination.constants';
import { parsePageParam } from '@/app/lib/utils/pagination';

export type SearchState = {
  q: string;
  yearFrom?: number;
  yearTo?: number;
  fields: string[];
  venue?: string;
  minCitations?: number;
  openAccess: boolean;
  types: string[];
  sort: SearchSort;
  page: number;
};

type ParamsLike = { get(name: string): string | null };

function int(value: string | null, min: number, max: number): number | undefined {
  if (value === null || !/^\d+$/.test(value.trim())) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

function list(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(v => v.trim()).filter(Boolean))];
}

export function maxPage(pageSize = PAGE_SIZE) {
  return Math.floor(MAX_RESULTS / pageSize);
}

/** Reads the /search URL into a state the API accepts. Invalid values are dropped rather than sent. */
export function parseSearchParams(params: ParamsLike): SearchState {
  let yearFrom = int(params.get('yearFrom'), MIN_YEAR, MAX_YEAR);
  let yearTo = int(params.get('yearTo'), MIN_YEAR, MAX_YEAR);
  if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];

  const sort = params.get('sort');
  const venue = params.get('venue')?.trim();

  return {
    q: params.get('q')?.trim() ?? '',
    yearFrom,
    yearTo,
    fields: list(params.get('fields')),
    venue: venue || undefined,
    minCitations: int(params.get('minCitations'), 0, Number.MAX_SAFE_INTEGER),
    openAccess: params.get('openAccess') === 'true',
    types: list(params.get('types')),
    sort: SORTS.includes(sort as SearchSort) ? (sort as SearchSort) : 'relevance',
    page: parsePageParam(params.get('page'), 1, maxPage()),
  };
}

/** Inverse of parseSearchParams. Defaults are omitted so URLs stay short and shareable. */
export function toSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.yearFrom !== undefined) params.set('yearFrom', String(state.yearFrom));
  if (state.yearTo !== undefined) params.set('yearTo', String(state.yearTo));
  if (state.fields.length) params.set('fields', state.fields.join(','));
  if (state.venue) params.set('venue', state.venue);
  if (state.minCitations !== undefined) params.set('minCitations', String(state.minCitations));
  if (state.openAccess) params.set('openAccess', 'true');
  if (state.types.length) params.set('types', state.types.join(','));
  if (state.sort !== 'relevance') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  return params;
}

/** OpenAlex field ids for the API; anything that is not an id (e.g. an old bookmarked field name) is dropped. */
function fieldIds(fields: string[]): number[] | undefined {
  const ids = fields.map(Number).filter(Number.isInteger);
  return ids.length ? ids : undefined;
}

/** Query object for GET /api/v1/papers/search. */
export function toApiQuery(state: SearchState, pageSize = PAGE_SIZE) {
  return {
    q: state.q,
    yearFrom: state.yearFrom,
    yearTo: state.yearTo,
    fields: fieldIds(state.fields),
    venue: state.venue ? [state.venue] : undefined,
    minCitations: state.minCitations,
    openAccess: state.openAccess || undefined,
    types: state.types.length ? state.types : undefined,
    sort: state.sort,
    offset: (state.page - 1) * pageSize,
    limit: pageSize,
  };
}

export type ActiveFilter = { id: string; label: string; remove: Partial<SearchState> };

/** One removable chip per applied filter, in the order the filter panel shows them. `labels` names field ids and types. */
export function activeFilters(state: SearchState, labels: Record<string, string> = {}): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  if (state.yearFrom !== undefined || state.yearTo !== undefined) {
    const label = state.yearFrom !== undefined && state.yearTo !== undefined
      ? `${state.yearFrom}–${state.yearTo}`
      : state.yearFrom !== undefined ? `From ${state.yearFrom}` : `Until ${state.yearTo}`;
    chips.push({ id: 'year', label, remove: { yearFrom: undefined, yearTo: undefined } });
  }
  if (state.openAccess) chips.push({ id: 'oa', label: 'Open access', remove: { openAccess: false } });
  if (state.minCitations !== undefined) {
    chips.push({ id: 'cites', label: `≥ ${state.minCitations.toLocaleString('en-US')} citations`, remove: { minCitations: undefined } });
  }
  if (state.venue) chips.push({ id: 'venue', label: `Venue: ${state.venue}`, remove: { venue: undefined } });
  for (const field of state.fields) {
    chips.push({ id: `field:${field}`, label: labels[field] ?? field, remove: { fields: state.fields.filter(f => f !== field) } });
  }
  for (const type of state.types) {
    chips.push({ id: `type:${type}`, label: labels[type] ?? type, remove: { types: state.types.filter(t => t !== type) } });
  }
  return chips;
}

/** Patch that removes every filter but keeps the query and sort. */
export const CLEAR_FILTERS: Partial<SearchState> = {
  yearFrom: undefined, yearTo: undefined, fields: [], venue: undefined, minCitations: undefined, openAccess: false, types: [],
};

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter(v => v !== value) : [...values, value];
}

/** Whole non-negative number from a text field, or undefined for blank/invalid input. */
export function parseNonNegativeInt(raw: string): number | undefined {
  return /^\d+$/.test(raw.trim()) ? Number(raw) : undefined;
}
