/** Returns a copy of `list` with the item at `from` moved to `to`. Out-of-range indexes are a no-op. */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Splits "a, b,,a" into ["a", "b"]. */
export function parseTags(input: string): string[] {
  return [...new Set(input.split(',').map(t => t.trim()).filter(Boolean))];
}
