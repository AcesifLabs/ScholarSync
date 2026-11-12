'use client';

import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { createUndoQueue, UNDO_WINDOW_MS } from '@/app/lib/utils/undo';

const queue = createUndoQueue();
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => queue.cancelAll());

type Change = {
  /** What the change affects, e.g. `library:${paperId}`; the UI asks {@link useUndoable} whether it is pending. */
  key: string;
  /** Shown in the toast, e.g. "Removed from your library". */
  message: string;
  /** Sends the change to the server when the undo window ends. */
  commit: () => void;
  /** The pending value the UI should show meanwhile (a removal needs none). */
  value?: unknown;
};

/** Reversible changes: shown as done immediately, sent after {@link UNDO_WINDOW_MS} unless the toast's Undo is pressed. */
export function useUndoable() {
  useSyncExternalStore(queue.subscribe, queue.version, () => 0);
  return {
    run({ key, message, commit, value = true }: Change) {
      const undo = queue.schedule(key, value, commit);
      toast(message, { duration: UNDO_WINDOW_MS, action: { label: 'Undo', onClick: undo } });
    },
    cancel: (key: string) => queue.cancel(key),
    pending: (key: string) => queue.has(key),
    pendingValue: <T,>(key: string) => queue.value(key) as T | undefined,
  };
}
