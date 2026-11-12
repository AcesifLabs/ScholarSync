import { ARXIV_ABS_BASE_URL, DOI_BASE_URL, OPENALEX_BASE_URL, PUBMED_BASE_URL } from '@/app/lib/constants/links.constants';
import { EXTERNAL_ID, SOURCE_LABELS } from '@/app/lib/constants/sources.constants';
import { ROUTES } from '@/app/lib/constants/routes.constants';

export type ExternalLink = { label: string; href: string };

/** Resolver links for a paper's identifiers (DOI, arXiv, PubMed, OpenAlex), in that order. */
export function externalLinks(ids: Record<string, unknown> | null | undefined): ExternalLink[] {
  const links: ExternalLink[] = [];
  const doi = ids?.[EXTERNAL_ID.DOI];
  const arxiv = ids?.[EXTERNAL_ID.ARXIV];
  const pubmed = ids?.[EXTERNAL_ID.PUBMED];
  const openalex = ids?.[EXTERNAL_ID.OPENALEX];
  if (typeof doi === 'string' && doi) links.push({ label: `DOI ${doi}`, href: `${DOI_BASE_URL}${doi}` });
  if (typeof arxiv === 'string' && arxiv) links.push({ label: `arXiv ${arxiv}`, href: `${ARXIV_ABS_BASE_URL}${arxiv}` });
  if ((typeof pubmed === 'string' && pubmed) || typeof pubmed === 'number') {
    links.push({ label: `PubMed ${pubmed}`, href: `${PUBMED_BASE_URL}${pubmed}` });
  }
  if (typeof openalex === 'string' && openalex) links.push({ label: `OpenAlex ${openalex}`, href: `${OPENALEX_BASE_URL}${openalex}` });
  return links;
}

/** Display names for a paper's source keys; unknown keys are shown as-is. */
export function sourceLabels(keys: readonly string[] | null | undefined): string[] {
  return (keys ?? []).map(key => SOURCE_LABELS[key] ?? key);
}

/** Where a paper was opened from: a section, or a section plus an id ("collection:<id>"). */
export type PaperOrigin = 'search' | 'library' | 'archive' | `collection:${string}` | `group:${string}` | `researcher:${string}` | `shared:${string}`;

/** The back link for a paper page opened from {@code from}; Search when unknown. */
export function backTarget(from: string | null | undefined): { label: string; href: string } {
  const value = from ?? '';
  const colon = value.indexOf(':');
  const kind = colon < 0 ? value : value.slice(0, colon);
  const id = colon < 0 ? '' : value.slice(colon + 1);
  switch (kind) {
    case 'library': return { label: 'Library', href: ROUTES.library };
    case 'archive': return { label: 'Archive', href: ROUTES.archive };
    case 'collection': if (id) return { label: 'Collection', href: ROUTES.collection(id) }; break;
    case 'group': if (id) return { label: 'Reading group', href: ROUTES.group(id) }; break;
    case 'researcher': if (id) return { label: 'Researcher', href: ROUTES.researcher(id) }; break;
    case 'shared': if (id) return { label: 'Shared collection', href: ROUTES.sharedCollection(id) }; break;
  }
  return { label: 'Search', href: ROUTES.search };
}
