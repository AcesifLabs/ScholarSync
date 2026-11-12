import { describe, expect, it } from 'vitest';
import { ROUTES } from './routes.constants';

describe('ROUTES', () => {
  it('encodes ids exactly once', () => {
    expect(ROUTES.paper('10.1/abc')).toBe('/paper/10.1%2Fabc');
    expect(ROUTES.paperRead('a b')).toBe('/paper/a%20b/read');
    expect(ROUTES.paperRead('p', { page: 4 })).toBe('/paper/p/read?page=4');
    expect(ROUTES.paperRead('p', { page: 1 })).toBe('/paper/p/read');
    expect(ROUTES.paperRead('p', { page: 4, annotation: 'a1' })).toBe('/paper/p/read?annotation=a1');
    expect(ROUTES.paperGraph('x%y')).toBe('/paper/x%25y/graph');
    expect(ROUTES.collection('c/1')).toBe('/collection/c%2F1');
    expect(ROUTES.researcher('A1')).toBe('/researchers/A1');
    expect(ROUTES.joinGroup('t?k')).toBe('/groups/join/t%3Fk');
    expect(ROUTES.sharedCollection('tok')).toBe('/shared/tok');
  });

  it('builds group views', () => {
    expect(ROUTES.group('g1')).toBe('/groups/g1');
    expect(ROUTES.group('g1', { tab: 'discussion', paper: 'p/1' })).toBe('/groups/g1?tab=discussion&paper=p%2F1');
    expect(ROUTES.group('g1', { tab: 'members' })).toBe('/groups/g1?tab=members');
  });

  it('builds search URLs', () => {
    expect(ROUTES.searchFor('graph & nets')).toBe('/search?q=graph+%26+nets');
    expect(ROUTES.researcherSearch('Ada')).toBe('/researchers?q=Ada');
    expect(ROUTES.researcherSearch('Ada L', 2)).toBe('/researchers?q=Ada+L&page=2');
  });
});
