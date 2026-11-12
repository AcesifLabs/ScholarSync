import { describe, expect, it } from 'vitest';
import { pageCount, parsePageParam } from './pagination';

describe('pageCount', () => {
  it.each([
    [0, 20, Infinity, 1],
    [1, 20, Infinity, 1],
    [20, 20, Infinity, 1],
    [21, 20, Infinity, 2],
    [5000, 20, 50, 50],
  ])('%i items / %i per page (max %d) → %i', (total, size, max, expected) => {
    expect(pageCount(total, size, max)).toBe(expected);
  });
});

describe('parsePageParam', () => {
  it.each([
    [null, 0],
    ['', 0],
    ['abc', 0],
    ['2.5', 0],
    ['-1', 0],
    ['3', 3],
    [' 4 ', 4],
    ['49', 49],
    ['50', 49],
    ['999999', 49],
  ])('%j → %i', (raw, expected) => {
    expect(parsePageParam(raw, 0, 49)).toBe(expected);
  });

  it('respects a one-based minimum', () => {
    expect(parsePageParam('0', 1, 10)).toBe(1);
  });
});
