export const TANSTACK_QUERY_CACHE_STALE_TIME: number = 60 * 1000;
/** Network and 5xx failures are retried this many times; 4xx are not retried. */
export const QUERY_RETRY_COUNT = 3;
/** Citation graphs change slowly and are expensive to build upstream. */
export const GRAPH_STALE_TIME = 60 * 60 * 1000;
export const AUTOCOMPLETE_STALE_TIME = 10 * 60 * 1000;
