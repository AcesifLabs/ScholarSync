/** Up to two uppercase initials for an avatar fallback ("Ada Lovelace" → "AL"); "?" when there is no name. */
export function initials(name: string | null | undefined): string {
  const letters = (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => [...part][0]!.toUpperCase());
  return letters.join('') || '?';
}

export function formatAuthors(authors: { name?: string | null }[] | null | undefined, max = 3): string {
  const names = (authors ?? []).map(a => a.name?.trim()).filter((n): n is string => !!n);
  if (names.length === 0) return 'Unknown authors';
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} et al.`;
}

export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
