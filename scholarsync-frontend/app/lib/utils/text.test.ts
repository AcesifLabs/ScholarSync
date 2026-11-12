import { describe, expect, it } from 'vitest';
import { formatAuthors, initials, truncate } from './text';

describe('initials', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['ada', 'A'],
    ['  Grace   Brewster Hopper ', 'GB'],
    ['Élodie Ünal', 'ÉÜ'],
    ['', '?'],
    [null, '?'],
    [undefined, '?'],
    ['   ', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('formatAuthors', () => {
  it.each([
    [[], 'Unknown authors'],
    [null, 'Unknown authors'],
    [[{ name: 'Ada' }], 'Ada'],
    [[{ name: 'Ada' }, { name: 'Alan' }], 'Ada, Alan'],
    [[{ name: 'A' }, { name: 'B' }, { name: 'C' }], 'A, B, C'],
    [[{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], 'A, B, C et al.'],
    [[{ name: ' ' }, { name: null }, { name: 'Real' }], 'Real'],
  ])('%j → %s', (authors, expected) => {
    expect(formatAuthors(authors)).toBe(expected);
  });
});

describe('truncate', () => {
  it('keeps short text and empty values', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate(null, 10)).toBe('');
  });

  it('cuts at a word boundary and adds an ellipsis', () => {
    expect(truncate('the quick brown fox jumps', 15)).toBe('the quick brown…');
  });

  it('hard-cuts a single long word', () => {
    expect(truncate('a'.repeat(20), 5)).toBe('aaaaa…');
  });
});
