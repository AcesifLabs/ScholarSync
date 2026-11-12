import type { Schemas } from '@/app/api/client';

export type ReadingStatus = Schemas['LibraryItemResponse']['status'];

export const READING_STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: 'TO_READ', label: 'To read' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

export const LIBRARY_SORT_OPTIONS = [
  { value: 'added', label: 'Recently added' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title' },
] as const;

export type LibrarySort = (typeof LIBRARY_SORT_OPTIONS)[number]['value'];

/** Concurrent requests a bulk action may send. */
export const BULK_CONCURRENCY = 5;

/** Status a newly saved paper starts with. */
export const DEFAULT_READING_STATUS: ReadingStatus = 'TO_READ';
