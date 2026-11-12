/** A rectangle in page pixels at capture time; width/height are the page's size then, so it can be rescaled. */
export type ScaledRect = { x1: number; y1: number; x2: number; y2: number; width: number; height: number };

/** Stored as annotations.position. The backend only relies on pageNumber and boundingRect.y1 (export ordering). */
export type ScaledPosition = { pageNumber: number; boundingRect: ScaledRect; rects: ScaledRect[] };

type ClientRect = { left: number; top: number; right: number; bottom: number };
type PageBox = { left: number; top: number; width: number; height: number };

/**
 * Converts a text selection's client rects into page-relative rects. Rects outside the page or with no area are
 * dropped (selections that spill into another page keep only the part on `pageNumber`). Null if nothing remains.
 */
export function toScaledPosition(clientRects: ClientRect[], page: PageBox, pageNumber: number): ScaledPosition | null {
  const rects: ScaledRect[] = [];
  for (const r of clientRects) {
    const x1 = Math.max(r.left, page.left) - page.left;
    const y1 = Math.max(r.top, page.top) - page.top;
    const x2 = Math.min(r.right, page.left + page.width) - page.left;
    const y2 = Math.min(r.bottom, page.top + page.height) - page.top;
    if (x2 - x1 < 1 || y2 - y1 < 1) continue;
    rects.push({ x1, y1, x2, y2, width: page.width, height: page.height });
  }
  if (rects.length === 0) return null;
  const boundingRect: ScaledRect = {
    x1: Math.min(...rects.map(r => r.x1)),
    y1: Math.min(...rects.map(r => r.y1)),
    x2: Math.max(...rects.map(r => r.x2)),
    y2: Math.max(...rects.map(r => r.y2)),
    width: page.width,
    height: page.height,
  };
  return { pageNumber, boundingRect, rects };
}

/** CSS box for a stored rect on a page currently rendered at pageWidth × pageHeight. */
export function toViewport(rect: ScaledRect, pageWidth: number, pageHeight: number) {
  const sx = pageWidth / rect.width;
  const sy = pageHeight / rect.height;
  return { left: rect.x1 * sx, top: rect.y1 * sy, width: (rect.x2 - rect.x1) * sx, height: (rect.y2 - rect.y1) * sy };
}

/** Annotations sorted by page then top edge, grouped per page (pages ascending). */
export function groupAnnotationsByPage<T extends { position: ScaledPosition }>(annotations: T[]): Map<number, T[]> {
  const sorted = [...annotations].sort((a, b) =>
    a.position.pageNumber - b.position.pageNumber || a.position.boundingRect.y1 - b.position.boundingRect.y1);
  const pages = new Map<number, T[]>();
  for (const a of sorted) {
    const list = pages.get(a.position.pageNumber) ?? [];
    list.push(a);
    pages.set(a.position.pageNumber, list);
  }
  return pages;
}

/** Narrows an untyped position from the API; malformed ones are skipped instead of crashing the reader. */
export function isScaledPosition(value: unknown): value is ScaledPosition {
  const p = value as ScaledPosition | null;
  return !!p && typeof p.pageNumber === 'number' && !!p.boundingRect && typeof p.boundingRect.y1 === 'number'
    && Array.isArray(p.rects) && p.rects.every(r => typeof r.x1 === 'number' && typeof r.width === 'number' && r.width > 0);
}
