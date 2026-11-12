import { describe, expect, it } from 'vitest';
import { libraryParams, LibraryStateMap, parseLibraryParams, withRemoved, withSaved, withSavedIfMissing, withUpdated } from './library';

const parse = (q: string) => parseLibraryParams(new URLSearchParams(q));

describe('library view params', () => {
  it('defaults for an empty or invalid URL', () => {
    expect(parse('')).toEqual({ tab: 'ALL', sort: 'added', page: 0 });
    expect(parse('status=READING&sort=random&page=-2')).toEqual({ tab: 'ALL', sort: 'added', page: 0 });
    expect(parse('page=1.5')).toMatchObject({ page: 0 });
  });

  it('round-trips a view and omits defaults', () => {
    const view = { tab: 'DONE', sort: 'title', page: 2 } as const;
    expect(libraryParams(view)).toBe('status=DONE&sort=title&page=3');
    expect(parse(libraryParams(view))).toEqual(view);
    expect(libraryParams(parse(''))).toBe('');
  });
});

describe('library state updates', () => {
  const states: LibraryStateMap = {
    a: { paperId: 'a', status: 'IN_PROGRESS', archived: true, lastPage: 7 },
  };

  it('saving keeps an existing status and last page, and starts new papers as To read', () => {
    expect(withSaved(states, 'a').a).toEqual({ paperId: 'a', status: 'IN_PROGRESS', archived: false, lastPage: 7 });
    expect(withSaved(states, 'b').b).toEqual({ paperId: 'b', status: 'TO_READ', archived: false, lastPage: null });
  });

  it('saving-if-missing leaves a known paper untouched', () => {
    expect(withSavedIfMissing(states, 'a')).toBe(states);
    expect(withSavedIfMissing(states, 'b').b?.status).toBe('TO_READ');
  });

  it('removing drops the paper and ignores unknown ones', () => {
    expect(withRemoved(states, 'a')).toEqual({});
    expect(withRemoved(states, 'zzz')).toBe(states);
  });

  it('updating applies only the given fields and ignores unknown papers', () => {
    expect(withUpdated(states, 'a', { status: 'DONE' }).a).toEqual({ paperId: 'a', status: 'DONE', archived: true, lastPage: 7 });
    expect(withUpdated(states, 'a', { lastPage: 12 }).a?.lastPage).toBe(12);
    expect(withUpdated(states, 'a', { archived: false }).a?.archived).toBe(false);
    expect(withUpdated(states, 'zzz', { status: 'DONE' })).toBe(states);
  });

  it('never mutates the input', () => {
    const before = JSON.stringify(states);
    withSaved(states, 'a'); withRemoved(states, 'a'); withUpdated(states, 'a', { status: 'DONE' });
    expect(JSON.stringify(states)).toBe(before);
  });
});
