export type GraphNodeData = {
  id: string;
  title: string;
  year: number | null;
  citationCount: number | null;
  authors: { id?: string | null; name?: string | null }[];
  depth: number;
};

/** force-graph replaces link endpoints with node objects after the first render, so accept both. */
type Endpoint = string | { id?: string | number };
export type GraphLinkData = { source: Endpoint; target: Endpoint };
export type GraphData = { nodes: GraphNodeData[]; links: GraphLinkData[] };

export function endpointId(endpoint: Endpoint): string {
  return typeof endpoint === 'string' ? endpoint : String(endpoint.id);
}

/**
 * Adds `extra` to `base`: existing nodes keep their object identity (and so their on-screen position and
 * smaller depth), new nodes are appended, and links are de-duplicated by source->target.
 */
export function mergeGraph(base: GraphData, extra: GraphData): GraphData {
  const nodes = [...base.nodes];
  const known = new Set(nodes.map(n => n.id));
  for (const node of extra.nodes) {
    if (!known.has(node.id)) {
      known.add(node.id);
      nodes.push(node);
    }
  }

  const links: GraphLinkData[] = [];
  const seen = new Set<string>();
  for (const link of [...base.links, ...extra.links]) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    const key = `${source}->${target}`;
    if (seen.has(key) || !known.has(source) || !known.has(target)) continue;
    seen.add(key);
    links.push(link);
  }
  return { nodes, links };
}

/** Theme token for nodes without a value; canvas callers pass its computed colour instead. */
export const MISSING_COLOR = 'var(--graph-missing)';

/** The theme's sequential scale (low → high); canvas callers pass the tokens' computed colours instead. */
export const SCALE_TOKENS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const;

/** Maps value within [min, max] onto {@code palette} (low → high). Missing values get `missing`. */
export function colorScale(
  value: number | null | undefined,
  [min, max]: [number, number],
  log = false,
  missing = MISSING_COLOR,
  palette: readonly string[] = SCALE_TOKENS,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return missing;
  const scale = (v: number) => (log ? Math.log10(Math.max(v, 0) + 1) : v);
  const span = scale(max) - scale(min);
  const t = span <= 0 ? 0.5 : Math.min(1, Math.max(0, (scale(value) - scale(min)) / span));
  return palette[Math.round(t * (palette.length - 1))]!;
}

/** [min, max] of the defined values, or [0, 0] when there are none. */
export function domain(values: (number | null | undefined)[]): [number, number] {
  // A loop instead of Math.min(...values): spreading a large graph can overflow the call stack
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === Infinity ? [0, 0] : [min, max];
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
