export const SORTS = ['relevance', 'citations', 'recent'] as const;
export type SearchSort = (typeof SORTS)[number];

export const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'citations', label: 'Most cited' },
  { value: 'recent', label: 'Most recent' },
];

/** Upper bound on paging through any result list (author search pages too). */
export const MAX_RESULTS = 1000;
/** Matches SearchFilters.MIN_YEAR on the backend, which rejects anything earlier. */
export const MIN_YEAR = 1800;
export const MAX_YEAR = new Date().getFullYear();

/** Size of the OpenAlex catalogue, the largest of the merged sources. */
export const CORPUS_SIZE_LABEL = '250 million';
