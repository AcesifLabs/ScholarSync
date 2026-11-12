export type FlatComment = { id: string; parentId?: string | null; createdAt: string };
export type CommentNode<T extends FlatComment> = T & { children: CommentNode<T>[]; depth: number };

/**
 * Builds a reply tree from a flat list. Siblings are ordered oldest first; a comment whose parent is missing
 * (or that would form a cycle) is shown as a top-level comment instead of being dropped.
 */
export function buildCommentTree<T extends FlatComment>(flat: T[]): CommentNode<T>[] {
  const byCreated = [...flat].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const nodes = new Map<string, CommentNode<T>>(byCreated.map(c => [c.id, { ...c, children: [], depth: 0 }]));

  const reachesItself = (id: string) => {
    const seen = new Set<string>();
    for (let cur: string | null | undefined = id; cur; cur = nodes.get(cur)?.parentId) {
      if (seen.has(cur)) return true;
      seen.add(cur);
    }
    return false;
  };

  const roots: CommentNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent && !reachesItself(node.id)) parent.children.push(node);
    else roots.push(node);
  }

  const setDepth = (list: CommentNode<T>[], depth: number) => list.forEach(n => { n.depth = depth; setDepth(n.children, depth + 1); });
  setDepth(roots, 0);
  return roots;
}
