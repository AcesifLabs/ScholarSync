import { describe, expect, it } from 'vitest';
import { colorScale, domain, escapeHtml, GraphData, GraphNodeData, mergeGraph } from './graph';

const node = (id: string, depth = 1): GraphNodeData => ({ id, title: id, year: 2020, citationCount: 1, authors: [], depth });

describe('mergeGraph', () => {
  it('appends new nodes and keeps existing node objects', () => {
    const root = node('a', 0);
    const base: GraphData = { nodes: [root, node('b')], links: [{ source: 'a', target: 'b' }] };
    const extra: GraphData = { nodes: [node('b', 2), node('c', 2)], links: [{ source: 'b', target: 'c' }] };

    const merged = mergeGraph(base, extra);

    expect(merged.nodes.map(n => n.id)).toEqual(['a', 'b', 'c']);
    expect(merged.nodes[0]).toBe(root);
    expect(merged.nodes[1].depth).toBe(1);
    expect(merged.links).toHaveLength(2);
  });

  it('dedupes links whose endpoints were replaced by node objects', () => {
    const a = node('a');
    const b = node('b');
    const base: GraphData = { nodes: [a, b], links: [{ source: a, target: b }] };
    const merged = mergeGraph(base, { nodes: [], links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }] });
    expect(merged.links).toHaveLength(2);
  });

  it('drops links to unknown nodes and is stable when merging a graph into itself', () => {
    const base: GraphData = { nodes: [node('a')], links: [{ source: 'a', target: 'ghost' }] };
    expect(mergeGraph(base, base)).toEqual({ nodes: base.nodes, links: [] });
  });

  it('handles empty graphs', () => {
    expect(mergeGraph({ nodes: [], links: [] }, { nodes: [], links: [] })).toEqual({ nodes: [], links: [] });
  });
});

describe('colorScale', () => {
  it('maps the ends of the domain to the ends of the scale', () => {
    expect(colorScale(0, [0, 10])).toBe('var(--chart-1)');
    expect(colorScale(10, [0, 10])).toBe('var(--chart-5)');
  });

  it('clamps values outside the domain', () => {
    expect(colorScale(-5, [0, 10])).toBe(colorScale(0, [0, 10]));
    expect(colorScale(50, [0, 10])).toBe(colorScale(10, [0, 10]));
  });

  it('uses the middle colour for a flat domain and the missing colour for missing values', () => {
    expect(colorScale(5, [5, 5])).toBe('var(--chart-3)');
    expect(colorScale(null, [0, 10])).toBe('var(--graph-missing)');
    expect(colorScale(undefined, [0, 10], false, 'grey')).toBe('grey');
  });

  it('log scale spreads small citation counts', () => {
    expect(colorScale(10, [0, 10000])).toBe('var(--chart-1)');
    expect(colorScale(10, [0, 10000], true)).toBe('var(--chart-2)');
  });

  it('uses a given palette', () => {
    expect(colorScale(10, [0, 10], false, 'grey', ['a', 'b'])).toBe('b');
  });
});

describe('domain', () => {
  it.each([
    [[3, 1, 2], [1, 3]],
    [[null, 5, undefined], [5, 5]],
    [[], [0, 0]],
    [[null], [0, 0]],
  ])('%j → %j', (values, expected) => {
    expect(domain(values)).toEqual(expected);
  });

  it('handles more values than fit in a spread call', () => {
    expect(domain(Array.from({ length: 200_000 }, (_, i) => i))).toEqual([0, 199_999]);
  });
});

describe('escapeHtml', () => {
  it('escapes markup in titles', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')"> & co`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; co');
  });
});
