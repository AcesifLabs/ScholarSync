import { describe, expect, it } from 'vitest';
import { externalLinks, sourceLabels, backTarget } from './paper';

describe('externalLinks', () => {
  it.each([null, undefined, {}])('returns nothing for %j', ids => {
    expect(externalLinks(ids)).toEqual([]);
  });

  it('builds each resolver link', () => {
    expect(externalLinks({ DOI: '10.1/x' })).toEqual([{ label: 'DOI 10.1/x', href: 'https://doi.org/10.1/x' }]);
    expect(externalLinks({ ArXiv: '1706.03762' })).toEqual([{ label: 'arXiv 1706.03762', href: 'https://arxiv.org/abs/1706.03762' }]);
    expect(externalLinks({ PubMed: 123 })).toEqual([{ label: 'PubMed 123', href: 'https://pubmed.ncbi.nlm.nih.gov/123' }]);
    expect(externalLinks({ PubMed: '456' })[0].href).toBe('https://pubmed.ncbi.nlm.nih.gov/456');
  });

  it('links OpenAlex works', () => {
    expect(externalLinks({ OpenAlex: 'W123' })).toEqual([{ label: 'OpenAlex W123', href: 'https://openalex.org/W123' }]);
  });

  it('keeps DOI, arXiv, PubMed, OpenAlex order and ignores other ids', () => {
    expect(externalLinks({ OpenAlex: 'W1', PubMed: 1, CorpusId: 9, ArXiv: 'a', DOI: 'd' }).map(l => l.label))
      .toEqual(['DOI d', 'arXiv a', 'PubMed 1', 'OpenAlex W1']);
  });

  it.each([{ DOI: 5 }, { ArXiv: null }, { DOI: '' }, { PubMed: null }, { PubMed: {} }])('skips unusable values %j', ids => {
    expect(externalLinks(ids)).toEqual([]);
  });
});

describe('sourceLabels', () => {
  it('names known sources and keeps unknown keys', () => {
    expect(sourceLabels(['openalex', 'europepmc', 'arxiv', 'mystery'])).toEqual(['OpenAlex', 'Europe PMC', 'arXiv', 'mystery']);
  });

  it.each([null, undefined, []])('is empty for %j', keys => {
    expect(sourceLabels(keys)).toEqual([]);
  });
});

describe('backTarget', () => {
  it.each([
    ['library', 'Library', '/library'],
    ['collection:c1', 'Collection', '/collection/c1'],
    ['group:g/1', 'Reading group', '/groups/g%2F1'],
    ['researcher:A1', 'Researcher', '/researchers/A1'],
    ['shared:t', 'Shared collection', '/shared/t'],
    ['collection:', 'Search', '/search'],
    ['nonsense', 'Search', '/search'],
    [null, 'Search', '/search'],
  ])('%s → %s', (from, label, href) => {
    expect(backTarget(from)).toEqual({ label, href });
  });
});
