import { describe, expect, it } from 'vitest';
import { activeFilters, CLEAR_FILTERS, maxPage, parseNonNegativeInt, parseSearchParams, SearchState, toApiQuery, toggleValue, toSearchParams } from './search';

const parse = (query: string) => parseSearchParams(new URLSearchParams(query));

describe('parseSearchParams', () => {
  it('applies defaults for an empty URL', () => {
    expect(parse('')).toEqual({
      q: '', yearFrom: undefined, yearTo: undefined, fields: [], venue: undefined, minCitations: undefined,
      openAccess: false, types: [], sort: 'relevance', page: 1,
    });
  });

  it('reads every filter', () => {
    expect(parse('q=%20graphs%20&yearFrom=2019&yearTo=2021&fields=Physics,Biology&venue=Nature&minCitations=10&openAccess=true&types=Review&sort=recent&page=3'))
      .toEqual({
        q: 'graphs', yearFrom: 2019, yearTo: 2021, fields: ['Physics', 'Biology'], venue: 'Nature', minCitations: 10,
        openAccess: true, types: ['Review'], sort: 'recent', page: 3,
      });
  });

  it.each([
    ['yearFrom=abc', { yearFrom: undefined }],
    ['yearFrom=1700', { yearFrom: undefined }],
    ['yearTo=2200', { yearTo: undefined }],
    ['yearFrom=-5', { yearFrom: undefined }],
    ['minCitations=-1', { minCitations: undefined }],
    ['minCitations=1.5', { minCitations: undefined }],
    ['sort=popular', { sort: 'relevance' }],
    ['page=0', { page: 1 }],
    ['page=abc', { page: 1 }],
    ['page=9999', { page: maxPage() }],
    ['openAccess=yes', { openAccess: false }],
    ['venue=%20%20', { venue: undefined }],
  ])('drops invalid %s', (query, expected) => {
    expect(parse(query)).toMatchObject(expected);
  });

  it('swaps a reversed year range', () => {
    expect(parse('yearFrom=2022&yearTo=2018')).toMatchObject({ yearFrom: 2018, yearTo: 2022 });
  });

  it('dedupes and trims list values', () => {
    expect(parse('fields=A,%20B,,A').fields).toEqual(['A', 'B']);
  });
});

describe('toSearchParams', () => {
  it('omits defaults', () => {
    expect(toSearchParams(parse('q=x')).toString()).toBe('q=x');
  });

  it('round-trips through parseSearchParams', () => {
    const state: SearchState = {
      q: 'deep learning', yearFrom: 2010, yearTo: 2020, fields: ['Computer Science', 'Physics'], venue: 'ICML',
      minCitations: 0, openAccess: true, types: ['Review', 'Dataset'], sort: 'citations', page: 4,
    };
    expect(parseSearchParams(toSearchParams(state))).toEqual(state);
  });
});

describe('toApiQuery', () => {
  it('turns page into offset and leaves unset filters undefined', () => {
    expect(toApiQuery({ ...parse('q=x'), page: 3 }, 20)).toEqual({
      q: 'x', yearFrom: undefined, yearTo: undefined, fields: undefined, venue: undefined, minCitations: undefined,
      openAccess: undefined, types: undefined, sort: 'relevance', offset: 40, limit: 20,
    });
  });

  it('sends fields as numeric OpenAlex ids and drops anything else', () => {
    expect(toApiQuery(parse('q=x&fields=17,27')).fields).toEqual([17, 27]);
    expect(toApiQuery(parse('q=x&fields=17,Physics')).fields).toEqual([17]);
    expect(toApiQuery(parse('q=x&fields=Physics')).fields).toBeUndefined();
  });

  it('never exceeds the 1000 result window on the last page', () => {
    const q = toApiQuery({ ...parse('q=x'), page: maxPage() });
    expect(q.offset + q.limit).toBeLessThanOrEqual(1000);
  });
});

describe('activeFilters', () => {
  it('returns no chips without filters', () => {
    expect(activeFilters(parse('q=x&sort=recent&page=2'))).toEqual([]);
  });

  it.each([
    ['yearFrom=2019&yearTo=2021', '2019–2021'],
    ['yearFrom=2019', 'From 2019'],
    ['yearTo=2021', 'Until 2021'],
    ['minCitations=12000', '≥ 12,000 citations'],
    ['minCitations=0', '≥ 0 citations'],
    ['venue=Nature', 'Venue: Nature'],
    ['openAccess=true', 'Open access'],
  ])('%s → %s', (query, label) => {
    expect(activeFilters(parse(query)).map(c => c.label)).toEqual([label]);
  });

  it('makes one chip per field and type, labelling types', () => {
    const chips = activeFilters(parse('fields=Physics,Biology&types=Review,JournalArticle'), { JournalArticle: 'Journal article' });
    expect(chips.map(c => c.label)).toEqual(['Physics', 'Biology', 'Review', 'Journal article']);
  });

  it('names field ids with the given labels and keeps unknown ids as-is', () => {
    const chips = activeFilters(parse('fields=17,99'), { 17: 'Computer Science' });
    expect(chips.map(c => c.label)).toEqual(['Computer Science', '99']);
  });

  it('each chip removes only itself', () => {
    const state = parse('q=x&fields=A,B&yearFrom=2000&openAccess=true');
    const fieldA = activeFilters(state).find(c => c.id === 'field:A')!;
    expect({ ...state, ...fieldA.remove }).toEqual({ ...state, fields: ['B'] });
    const year = activeFilters(state).find(c => c.id === 'year')!;
    expect({ ...state, ...year.remove }).toMatchObject({ yearFrom: undefined, yearTo: undefined, fields: ['A', 'B'], openAccess: true });
  });

  it('CLEAR_FILTERS leaves query and sort but no chips', () => {
    const state = { ...parse('q=x&sort=citations&fields=A&venue=V&minCitations=3&openAccess=true&types=Review&yearTo=2000'), ...CLEAR_FILTERS };
    expect(activeFilters(state)).toEqual([]);
    expect(state.q).toBe('x');
    expect(state.sort).toBe('citations');
  });
});

describe('toggleValue', () => {
  it('adds a missing value and removes a present one', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleValue([], 'x')).toEqual(['x']);
  });

  it('does not mutate the input', () => {
    const input = ['a'];
    toggleValue(input, 'b');
    expect(input).toEqual(['a']);
  });
});

describe('parseNonNegativeInt', () => {
  it.each([
    ['10', 10], [' 7 ', 7], ['0', 0],
    ['', undefined], ['  ', undefined], ['-3', undefined], ['1.5', undefined], ['abc', undefined], ['12a', undefined],
  ])('%j → %j', (raw, expected) => {
    expect(parseNonNegativeInt(raw)).toBe(expected);
  });
});
