/** Pages needed for `total` items, capped at `maxPages`; at least 1 so an empty list is still "page 1 of 1". */
export function pageCount(total: number, pageSize: number, maxPages = Infinity): number {
  return Math.max(1, Math.min(Math.ceil(total / pageSize), maxPages));
}

/** A page number from the URL as a whole number in [min, max]: missing or invalid → min, too large → max. */
export function parsePageParam(raw: string | null, min: number, max: number): number {
  if (raw === null || !/^\d+$/.test(raw.trim())) return min;
  return Math.min(Math.max(Number(raw), min), max);
}
