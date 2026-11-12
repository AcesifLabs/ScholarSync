CREATE TABLE library_items (
    user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    paper_id          text NOT NULL REFERENCES papers (id),
    status            text NOT NULL DEFAULT 'TO_READ' CHECK (status IN ('TO_READ', 'IN_PROGRESS', 'DONE')),
    status_changed_at timestamptz NOT NULL DEFAULT now(),
    archived_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, paper_id)
);

-- Library tabs and "Continue reading"
CREATE INDEX library_items_active_status_idx ON library_items (user_id, status, updated_at DESC) WHERE archived_at IS NULL;
-- "Recently added"
CREATE INDEX library_items_created_idx ON library_items (user_id, created_at DESC);
-- Archive page
CREATE INDEX library_items_archived_idx ON library_items (user_id) WHERE archived_at IS NOT NULL;
-- FK lookups when a paper row is touched
CREATE INDEX library_items_paper_idx ON library_items (paper_id);
