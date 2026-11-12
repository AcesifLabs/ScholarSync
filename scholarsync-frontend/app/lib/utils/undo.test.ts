import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUndoQueue } from './undo';

describe('createUndoQueue', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows the change as pending and commits it when the window ends', () => {
    const queue = createUndoQueue(1000);
    const commit = vi.fn();
    queue.schedule('library:p1', true, commit);
    expect(queue.has('library:p1')).toBe(true);
    vi.advanceTimersByTime(999);
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledOnce();
    expect(queue.has('library:p1')).toBe(false);
  });

  it('undo drops the change without committing', () => {
    const queue = createUndoQueue(1000);
    const commit = vi.fn();
    const undo = queue.schedule('k', true, commit);
    undo();
    vi.advanceTimersByTime(5000);
    expect(commit).not.toHaveBeenCalled();
    expect(queue.has('k')).toBe(false);
  });

  it('a newer change to the same key replaces the older one, and the old undo no longer touches it', () => {
    const queue = createUndoQueue(1000);
    const first = vi.fn();
    const second = vi.fn();
    const undoFirst = queue.schedule('role:u1', 'ADMIN', first);
    queue.schedule('role:u1', 'VIEWER', second);
    undoFirst();
    expect(queue.value('role:u1')).toBe('VIEWER');
    vi.advanceTimersByTime(1000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('cancel drops one pending change', () => {
    const queue = createUndoQueue(1000);
    const commit = vi.fn();
    queue.schedule('k', true, commit);
    queue.cancel('k');
    vi.advanceTimersByTime(2000);
    expect(commit).not.toHaveBeenCalled();
  });

  it('cancelAll drops every pending change and notifies subscribers', () => {
    const queue = createUndoQueue(1000);
    const commit = vi.fn();
    const listener = vi.fn();
    queue.subscribe(listener);
    queue.schedule('a', true, commit);
    queue.schedule('b', true, commit);
    queue.cancelAll();
    vi.advanceTimersByTime(2000);
    expect(commit).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
