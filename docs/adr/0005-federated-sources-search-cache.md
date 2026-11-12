# 0005 Federated paper sources with a similarity search cache

Supersedes [0001](0001-cache-s2-metadata.md). Semantic Scholar access ended, so paper data now comes from six free sources whose metadata may be used commercially:
- OpenAlex
- Crossref
- Europe PMC
- arXiv
- OpenCitations
- Unpaywall, which is off by default because its commercial terms are unconfirmed

## Search

A search asks OpenAlex, Crossref, Europe PMC and arXiv in parallel. arXiv is skipped for citation-sorted searches.

**Merging.** Records are merged into one paper when they share a DOI, arXiv id, PMID or OpenAlex id, or else a normalized title of four or more words within a year. Shorter titles such as "Editorial" never merge records. Each field takes the first value in this order: Crossref, OpenAlex, Europe PMC, arXiv. Three kinds of field are exceptions:
- Abstracts take the longest value.
- Citation and reference counts take the largest.
- Fields of study, types and ids are the union of all sources.

**Ranking.** Relevance order is reciprocal rank fusion across the sources' own rankings.

**Filters.** Filters are strict: a paper missing a filtered field is excluded. Fields of study travel as OpenAlex field ids, because four of the names contain commas. Fields and types must come from the shared vocabulary.

## Paper ids

Paper ids are `doi:<doi>`, else `arxiv:<id>`, `pmid:<id>` or `openalex:W…`, with `/` written as `~` so an id fits in one URL path segment. A DOI the HTTP firewall would reject (`;`, `%`, `\\`), or one containing `~` or non-ASCII text, is written `doi64:<base64url>` instead. A merged paper keeps its first id even when a DOI turns up later. Any id that names a stored paper's identifier (an alias) resolves to that paper. Migration V9 rewrote the Semantic Scholar ids and cascaded the change to every reference, including `group_activity`, which has no foreign key.

## Cost control

Results are cached in `search_cache`, keyed by the filters and sort plus the query text. A lookup tries three layers in order:
1. An exact match on the normalized text.
2. Trigram similarity of at least 0.8.
3. Embedding cosine similarity of at least 0.95, using all-MiniLM-L6-v2 in-process with pgvector.

Similarity hits must also have the same numbers and the same tokens containing `+` or `#` (so "c++" never answers "c"). Queries shorter than 8 characters only match exactly.

Each entry lives for 7 days, or 1 hour when a source failed to answer. Concurrent identical misses share one fan-out. Each source client spaces its calls to respect that source's published rate limit.

Merged papers are stored in `papers` and refreshed after 30 days. Saved items, detail pages and the reader read from the database. Source calls never run inside a transaction the paper service opens. A paper's PDF URL is set once and never replaced, because annotations are positioned on that document.

## Trade-offs

- The cache can serve results up to a week old.
- A similar query sometimes gets a slightly different query's results. The thresholds are logged on every lookup so they can be tuned.
- The embedding model adds about 90 MB to the backend.
