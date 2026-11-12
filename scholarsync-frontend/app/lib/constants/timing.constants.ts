export const SEARCH_DEBOUNCE_MS = 300;
/** Reader page width follows the container only after resizing pauses, so PDF pages re-rasterise once. */
export const READER_RESIZE_DEBOUNCE_MS = 150;
/** The graph canvas resizes once the sidebar's width transition (180ms) has finished, not on every frame of it. */
export const GRAPH_RESIZE_DEBOUNCE_MS = 200;

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
export const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

/** How long the sign-in callback waits for the session before showing the error page. */
export const AUTH_CALLBACK_TIMEOUT_MS = 10_000;
