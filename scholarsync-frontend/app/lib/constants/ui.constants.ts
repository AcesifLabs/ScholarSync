/** Tailwind's default `md` breakpoint; keep in sync with the `md:` classes. */
export const MD_BREAKPOINT_PX = 768;
export const MD_MEDIA_QUERY = `(min-width: ${MD_BREAKPOINT_PX}px)`;

/** localStorage keys for per-browser preferences. */
export const SETTING_KEYS = {
  shortcutsEnabled: 'scholarsync.shortcuts-enabled',
  sidebarCollapsed: 'scholarsync.sidebar-collapsed',
  searchCompact: 'scholarsync.search-compact',
  annotationsPanelOpen: 'scholarsync.reader.annotations-open',
  readerZoom: 'scholarsync.reader.zoom',
  annotationVisibility: (userId: string) => `scholarsync.annotation-visibility.${userId}`,
} as const;
