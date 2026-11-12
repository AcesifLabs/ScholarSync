-- Papers now come from several sources (ADR 0005). Ids become source-neutral keys and searches are cached.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE papers
    ADD COLUMN doi         text,
    ADD COLUMN arxiv_id    text,
    ADD COLUMN pmid        text,
    ADD COLUMN openalex_id text,
    ADD COLUMN sources     text[] NOT NULL DEFAULT '{}';

UPDATE papers SET
    doi      = lower(regexp_replace(external_ids ->> 'DOI', '^https?://(dx\.)?doi\.org/', '', 'i')),
    arxiv_id = regexp_replace(external_ids ->> 'ArXiv', 'v\d+$', ''),
    pmid     = external_ids ->> 'PubMed',
    sources  = '{semanticscholar}'
WHERE external_ids IS NOT NULL;

-- arXiv's own DataCite DOIs identify the preprint, which the arXiv id already does
UPDATE papers SET arxiv_id = coalesce(arxiv_id, substring(doi FROM '^10\.48550/arxiv\.(.+)$')), doi = NULL
WHERE doi LIKE '10.48550/arxiv.%';

-- Fails the migration if two legacy rows share an identifier, rather than guessing which one to keep
CREATE UNIQUE INDEX papers_doi_key ON papers (doi) WHERE doi IS NOT NULL;
CREATE UNIQUE INDEX papers_arxiv_id_key ON papers (arxiv_id) WHERE arxiv_id IS NOT NULL;
CREATE UNIQUE INDEX papers_pmid_key ON papers (pmid) WHERE pmid IS NOT NULL;
CREATE UNIQUE INDEX papers_openalex_id_key ON papers (openalex_id) WHERE openalex_id IS NOT NULL;

ALTER TABLE library_items DROP CONSTRAINT library_items_paper_id_fkey,
    ADD CONSTRAINT library_items_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id) ON UPDATE CASCADE;
ALTER TABLE collection_papers DROP CONSTRAINT collection_papers_paper_id_fkey,
    ADD CONSTRAINT collection_papers_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id) ON UPDATE CASCADE;
ALTER TABLE annotations DROP CONSTRAINT annotations_paper_id_fkey,
    ADD CONSTRAINT annotations_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id) ON UPDATE CASCADE;
ALTER TABLE group_papers DROP CONSTRAINT group_papers_paper_id_fkey,
    ADD CONSTRAINT group_papers_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id) ON UPDATE CASCADE;
ALTER TABLE group_comments DROP CONSTRAINT group_comments_paper_id_fkey,
    ADD CONSTRAINT group_comments_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id) ON UPDATE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT notifications_paper_id_fkey,
    ADD CONSTRAINT notifications_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id) ON UPDATE CASCADE;

-- New ids follow PaperKeys.idFor: '/' becomes '~' so an id fits in one URL path segment, and a DOI with a character
-- the HTTP firewall rejects (; % \), a '~' of its own or non-printable-ASCII text is written doi64:<base64url>.
ALTER TABLE papers ADD COLUMN new_id text;
UPDATE papers SET new_id = CASE
    WHEN doi IS NOT NULL AND (doi ~ '[;%\\~]' OR doi ~ '[^!-~]')
        THEN 'doi64:' || rtrim(translate(replace(encode(convert_to(doi, 'UTF8'), 'base64'), E'\n', ''), '+/', '-_'), '=')
    WHEN doi IS NOT NULL THEN 'doi:' || replace(doi, '/', '~')
    WHEN arxiv_id IS NOT NULL THEN 'arxiv:' || replace(arxiv_id, '/', '~')
    WHEN pmid IS NOT NULL THEN 'pmid:' || pmid
END;

-- group_activity.paper_id has no foreign key, so ON UPDATE CASCADE does not reach it
UPDATE group_activity ga SET paper_id = p.new_id FROM papers p WHERE ga.paper_id = p.id AND p.new_id IS NOT NULL;

UPDATE papers SET id = new_id WHERE new_id IS NOT NULL;
ALTER TABLE papers DROP COLUMN new_id;

CREATE TABLE search_cache (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text text        NOT NULL,
    query_norm text        NOT NULL,
    params_key text        NOT NULL,
    embedding  vector(384),
    paper_ids  text[]      NOT NULL,
    sources_ok text[]      NOT NULL,
    complete   boolean     NOT NULL,
    hit_count  int         NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    UNIQUE (params_key, query_norm)
);

CREATE INDEX search_cache_query_trgm_idx ON search_cache USING gin (query_norm gin_trgm_ops);
CREATE INDEX search_cache_embedding_idx ON search_cache USING hnsw (embedding vector_cosine_ops);
CREATE INDEX search_cache_expires_idx ON search_cache (expires_at);
