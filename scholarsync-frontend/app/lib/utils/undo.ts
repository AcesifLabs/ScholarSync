/** How long a reversible change waits, hidden from the UI, before it is sent to the server. */
export const UNDO_WINDOW_MS = 5000;

type Entry = { value: unknown; timer: ReturnType<typeof setTimeout> };

/**
 * Pending reversible changes, keyed by what they affect ("library:<paperId>"). Each one is shown as already done
 * (the UI reads its pending value) and committed when the window ends; undo drops it. A change still pending when
 * the page unloads is dropped too, so closing the tab inside the window means it never happened.
 */
export function createUndoQueue(windowMs = UNDO_WINDOW_MS) {
  const pending = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  let version = 0;
  const notify = () => { version++; listeners.forEach(l => l()); };

  return {
    /** Schedules {@code commit}; a later change to the same key replaces (and drops) the earlier one. */
    schedule(key: string, value: unknown, commit: () => void): () => void {
      const previous = pending.get(key);
      if (previous) clearTimeout(previous.timer);
      const timer = setTimeout(() => {
        if (pending.get(key)?.timer !== timer) return;
        pending.delete(key);
        commit();
        notify();
      }, windowMs);
      pending.set(key, { value, timer });
      notify();
      return () => {
        if (pending.get(key)?.timer !== timer) return;
        clearTimeout(timer);
        pending.delete(key);
        notify();
      };
    },
    /** Drops a pending change, as its undo would. */
    cancel(key: string) {
      const entry = pending.get(key);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(key);
      notify();
    },
    has: (key: string) => pending.has(key),
    value: (key: string) => pending.get(key)?.value,
    cancelAll() {
      pending.forEach(e => clearTimeout(e.timer));
      pending.clear();
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    version: () => version,
  };
}
