import type { Schemas } from '@/app/api/client';

export type HighlightColor = Schemas['AnnotationResponse']['color'];

/** Visibility value for "only me"; any other value in the picker is a group id. */
export const PRIVATE_VISIBILITY = 'PRIVATE' satisfies Schemas['AnnotationResponse']['visibility'];

/** Each colour carries a meaning so a group reads highlights the same way. Values are theme tokens in globals.css. */
export const HIGHLIGHT_COLORS: { value: HighlightColor; label: string; css: string }[] = [
  { value: 'YELLOW', label: 'Key claim', css: 'var(--highlight-yellow)' },
  { value: 'GREEN', label: 'Evidence', css: 'var(--highlight-green)' },
  { value: 'RED', label: 'Disagreement', css: 'var(--highlight-red)' },
  { value: 'BLUE', label: 'Question', css: 'var(--highlight-blue)' },
];

export const colorLabel = (color: HighlightColor) => HIGHLIGHT_COLORS.find(c => c.value === color)?.label ?? HIGHLIGHT_COLORS[0].label;

export const colorCss = (color: HighlightColor) => HIGHLIGHT_COLORS.find(c => c.value === color)?.css ?? HIGHLIGHT_COLORS[0].css;
