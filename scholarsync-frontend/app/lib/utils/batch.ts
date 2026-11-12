/**
 * Runs {@code fn} over {@code items} with at most {@code limit} in flight, and reports how many failed.
 * shortcut: one request per item over the existing endpoints; add a batch endpoint if people bulk-edit more than ~50 papers.
 */
export async function settleLimited<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<unknown>): Promise<{ ok: number; failed: number }> {
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++]!;
      try { await fn(item); } catch { failed++; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { ok: items.length - failed, failed };
}
