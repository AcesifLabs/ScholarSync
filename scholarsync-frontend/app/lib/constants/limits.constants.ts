// Text limits mirroring the backend's validation (@Size on the request DTOs); keep both sides in sync.
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const ENTRY_NOTE_MAX = 5000;
export const ANNOTATION_QUOTE_MAX = 5000;
export const ANNOTATION_TEXT_MAX = 10000;
export const COMMENT_MAX = 20000;
export const AUTHOR_QUERY_MAX = 200;
/** pdf.max-bytes on the backend (52428800). */
export const PDF_MAX_MB = 50;
