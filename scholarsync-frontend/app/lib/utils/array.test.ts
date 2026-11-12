import { describe, expect, it } from 'vitest';
import { parseTags, reorder } from './array';

describe('reorder', () => {
  const list = ['a', 'b', 'c', 'd'];

  it.each([
    [0, 3, ['b', 'c', 'd', 'a']],
    [3, 0, ['d', 'a', 'b', 'c']],
    [1, 2, ['a', 'c', 'b', 'd']],
    [2, 1, ['a', 'c', 'b', 'd']],
    [1, 1, ['a', 'b', 'c', 'd']],
  ])('moves %i → %i', (from, to, expected) => {
    expect(reorder(list, from, to)).toEqual(expected);
  });

  it.each([[-1, 0], [0, -1], [4, 0], [0, 4]])('ignores out-of-range %i → %i', (from, to) => {
    expect(reorder(list, from, to)).toEqual(list);
  });

  it('does not mutate the input and handles empty lists', () => {
    reorder(list, 0, 3);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
    expect(reorder([], 0, 0)).toEqual([]);
  });
});

describe('parseTags', () => {
  it.each([
    ['', []],
    ['  ,  ', []],
    ['one', ['one']],
    [' a , b,,a ', ['a', 'b']],
    ['cite in ch 2, foundational', ['cite in ch 2', 'foundational']],
  ])('%j → %j', (input, expected) => {
    expect(parseTags(input)).toEqual(expected);
  });
});
