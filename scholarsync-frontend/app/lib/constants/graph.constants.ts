export type GraphDirectionParam = 'cites' | 'cited_by' | 'both';
export type GraphDepth = 1 | 2;
export type GraphColorBy = 'year' | 'citations';

export const GRAPH_DIRECTION_OPTIONS: { value: GraphDirectionParam; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'cited_by', label: 'Cited by' },
  { value: 'cites', label: 'References' },
];
export const GRAPH_DEPTH_OPTIONS: { value: GraphDepth; label: string }[] = [{ value: 1, label: '1 hop' }, { value: 2, label: '2 hops' }];
export const GRAPH_COLOR_BY_OPTIONS: { value: GraphColorBy; label: string }[] = [{ value: 'year', label: 'Year' }, { value: 'citations', label: 'Citations' }];

// Force tuning: the defaults pack nodes tighter than their radius, so spread them out.
export const GRAPH_LINK_DISTANCE = 70;
export const GRAPH_CHARGE_STRENGTH = -160;
export const GRAPH_COOLDOWN_TICKS = 150;
export const GRAPH_ZOOM_TO_FIT_MS = 400;
export const GRAPH_ZOOM_TO_FIT_PADDING = 48;

/** Pixels of node radius per √val; with nodeVal's range this gives about 4px (uncited) to 17px (200k citations). */
export const GRAPH_NODE_REL_SIZE = 3.5;
