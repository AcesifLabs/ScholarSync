CREATE TABLE group_invites (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   uuid NOT NULL REFERENCES reading_groups (id) ON DELETE CASCADE,
    token      text NOT NULL UNIQUE,
    role       text NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
    expires_at timestamptz NOT NULL,
    created_by uuid REFERENCES users (id) ON DELETE SET NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX group_invites_group_idx ON group_invites (group_id);

CREATE TABLE group_papers (
    group_id uuid NOT NULL REFERENCES reading_groups (id) ON DELETE CASCADE,
    paper_id text NOT NULL REFERENCES papers (id),
    added_by uuid REFERENCES users (id) ON DELETE SET NULL,
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, paper_id)
);

CREATE INDEX group_papers_added_idx ON group_papers (group_id, added_at DESC);

CREATE TABLE group_comments (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   uuid NOT NULL REFERENCES reading_groups (id) ON DELETE CASCADE,
    paper_id   text NOT NULL REFERENCES papers (id),
    author_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_id  uuid REFERENCES group_comments (id) ON DELETE CASCADE,
    body_md    text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at  timestamptz,
    deleted_at timestamptz
);

CREATE INDEX group_comments_thread_idx ON group_comments (group_id, paper_id, created_at);

CREATE TABLE group_activity (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id   uuid NOT NULL REFERENCES reading_groups (id) ON DELETE CASCADE,
    actor_id   uuid REFERENCES users (id) ON DELETE SET NULL,
    type       text NOT NULL CHECK (type IN ('PAPER_ADDED', 'COMMENT_POSTED', 'ANNOTATION_ADDED', 'MEMBER_JOINED')),
    paper_id   text,
    payload    jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Feed, newest first, paged with "id < before"
CREATE INDEX group_activity_feed_idx ON group_activity (group_id, id DESC);
