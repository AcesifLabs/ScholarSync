/** Rendered PDF page width bounds and the horizontal padding of the scroll container. */
export const PAGE_MIN_WIDTH = 300;
export const PAGE_MAX_WIDTH = 1000;
export const PAGE_GUTTER = 32;
/** A page counts as current once less than this much of it is scrolled above the container top. */
export const CURRENT_PAGE_OFFSET = 40;

/** New-highlight popover: viewport margin, width (w-80) and rough height, so it stays on screen. */
export const POPOVER_MARGIN = 16;
export const POPOVER_WIDTH = 320;
export const POPOVER_HEIGHT = 260;
/** Gap between the end of the selection and the popover. */
export const POPOVER_OFFSET = 8;

/** The last page is saved once the reader has stayed on a page this long. */
export const LAST_PAGE_SAVE_DELAY_MS = 2000;
/** A text selection must stop changing for this long before "Highlight" appears (drag, shift+arrows, long-press). */
export const SELECTION_SETTLE_MS = 250;
