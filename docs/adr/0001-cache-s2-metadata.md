# 0001 Cache Semantic Scholar metadata in `papers`

Superseded by [0005](0005-federated-sources-search-cache.md).

When a user saves, collects or opens a paper, its metadata is upserted into `papers`, keyed by S2 `paperId`. Library, Collections, Groups and exports read from our database. S2 is called only for search, detail refresh, authors and the citation graph. This keeps saved views fast and stops them consuming the S2 rate limit. The downside is that cached citation counts go stale until the paper is opened again.
