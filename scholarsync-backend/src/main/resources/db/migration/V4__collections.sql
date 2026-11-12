CREATE TABLE collections (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name        text NOT NULL,
    description text,
    visibility  text NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'PUBLIC_LINK')),
    share_token text UNIQUE,
    archived_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT collections_owner_name_key UNIQUE (owner_id, name),
    CONSTRAINT collections_token_matches_visibility CHECK ((visibility = 'PUBLIC_LINK') = (share_token IS NOT NULL))
);

-- "My collections", newest activity first
CREATE INDEX collections_owner_updated_idx ON collections (owner_id, updated_at DESC);

CREATE TABLE collection_papers (
    collection_id uuid NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    paper_id      text NOT NULL REFERENCES papers (id),
    position      int  NOT NULL,
    note          text,
    tags          text[] NOT NULL DEFAULT '{}',
    added_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, paper_id)
);

CREATE INDEX collection_papers_position_idx ON collection_papers (collection_id, position);
CREATE INDEX collection_papers_tags_idx ON collection_papers USING gin (tags);
CREATE INDEX collection_papers_paper_idx ON collection_papers (paper_id);
