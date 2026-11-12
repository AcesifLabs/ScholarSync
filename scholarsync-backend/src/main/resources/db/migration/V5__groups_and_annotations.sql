CREATE TABLE reading_groups (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    description text,
    tags        text[] NOT NULL DEFAULT '{}',
    owner_id    uuid NOT NULL REFERENCES users (id),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
    group_id  uuid NOT NULL REFERENCES reading_groups (id) ON DELETE CASCADE,
    user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role      text NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

-- "My groups"
CREATE INDEX group_members_user_idx ON group_members (user_id);

CREATE TABLE annotations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id    text NOT NULL REFERENCES papers (id),
    author_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    visibility  text NOT NULL CHECK (visibility IN ('PRIVATE', 'GROUP')),
    group_id    uuid REFERENCES reading_groups (id) ON DELETE CASCADE,
    color       text NOT NULL,
    position    jsonb NOT NULL,
    quote       text,
    comment     text,
    resolved_at timestamptz,
    resolved_by uuid REFERENCES users (id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT annotations_group_matches_visibility CHECK ((visibility = 'GROUP') = (group_id IS NOT NULL))
);

-- A reader's own annotations on a paper
CREATE INDEX annotations_paper_author_idx ON annotations (paper_id, author_id);
-- Group annotations on a paper
CREATE INDEX annotations_paper_group_idx ON annotations (paper_id, group_id) WHERE group_id IS NOT NULL;
CREATE INDEX annotations_group_idx ON annotations (group_id) WHERE group_id IS NOT NULL;

CREATE TABLE annotation_replies (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id uuid NOT NULL REFERENCES annotations (id) ON DELETE CASCADE,
    author_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX annotation_replies_annotation_idx ON annotation_replies (annotation_id, created_at);
