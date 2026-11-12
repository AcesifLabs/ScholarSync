import type { ReadingStatus } from '@/app/lib/constants/library.constants';

/** Zoom steps relative to fit-to-width (1). */
export const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

/** The next zoom step above or below {@code current}; stays put at either end. */
export function stepZoom(current: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find(z => z > current + 1e-6) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find(z => z < current - 1e-6) ?? ZOOM_STEPS[0];
}

/** A page number typed or read from a URL, clamped to the document; null when it is not a number. */
export function clampPage(raw: string | number | null | undefined, numPages: number): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (raw === null || raw === undefined || String(raw).trim() === '' || !Number.isFinite(n) || numPages < 1) return null;
  return Math.min(numPages, Math.max(1, Math.round(n)));
}

/** Where the reader opens: a linked annotation's page, then ?page=, then the saved last page, else the top. */
export function initialPage(opts: { annotationPage?: number | null; pageParam?: string | null; lastPage?: number | null; numPages: number }): number {
  return clampPage(opts.annotationPage, opts.numPages)
    ?? clampPage(opts.pageParam, opts.numPages)
    ?? clampPage(opts.lastPage, opts.numPages)
    ?? 1;
}

/** A To-read paper becomes In progress once the reader turns past the first page. */
export function shouldMarkInProgress(status: ReadingStatus | undefined, page: number): boolean {
  return status === 'TO_READ' && page > 1;
}
