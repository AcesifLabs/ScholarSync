import { describe, expect, it } from 'vitest';
import { buildCommentTree } from './comments';

const c = (id: string, createdAt: string, parentId: string | null = null) => ({ id, parentId, createdAt });
const shape = (nodes: ReturnType<typeof buildCommentTree>): unknown =>
  nodes.map(n => ({ id: n.id, depth: n.depth, children: shape(n.children) }));

describe('buildCommentTree', () => {
  it('nests replies under their parents with depth', () => {
    const tree = buildCommentTree([
      c('a', '2026-01-01T00:00:00Z'),
      c('b', '2026-01-01T00:01:00Z', 'a'),
      c('c', '2026-01-01T00:02:00Z', 'b'),
      c('d', '2026-01-01T00:03:00Z'),
    ]);
    expect(shape(tree)).toEqual([
      { id: 'a', depth: 0, children: [{ id: 'b', depth: 1, children: [{ id: 'c', depth: 2, children: [] }] }] },
      { id: 'd', depth: 0, children: [] },
    ]);
  });

  it('orders siblings oldest first regardless of input order', () => {
    const tree = buildCommentTree([
      c('late', '2026-01-02T00:00:00Z', 'root'),
      c('root', '2026-01-01T00:00:00Z'),
      c('early', '2026-01-01T12:00:00Z', 'root'),
    ]);
    expect(tree[0].children.map(n => n.id)).toEqual(['early', 'late']);
  });

  it('promotes orphans to the top level', () => {
    const tree = buildCommentTree([c('x', '2026-01-01T00:00:00Z', 'deleted-parent')]);
    expect(shape(tree)).toEqual([{ id: 'x', depth: 0, children: [] }]);
  });

  it('does not loop on a cycle', () => {
    const tree = buildCommentTree([c('a', '2026-01-01T00:00:00Z', 'b'), c('b', '2026-01-01T00:01:00Z', 'a')]);
    expect(tree.map(n => n.id).sort()).toEqual(['a', 'b']);
  });

  it('handles an empty list and keeps extra fields', () => {
    expect(buildCommentTree([])).toEqual([]);
    expect(buildCommentTree([{ ...c('a', '2026-01-01T00:00:00Z'), bodyMd: 'hi' }])[0].bodyMd).toBe('hi');
  });
});
