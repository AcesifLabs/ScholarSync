CREATE TABLE notifications (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type         text NOT NULL CHECK (type IN ('GROUP_ADDED', 'REPLY', 'GROUP_PAPER_ADDED')),
    actor_id     uuid REFERENCES users (id) ON DELETE SET NULL,
    group_id     uuid REFERENCES reading_groups (id) ON DELETE CASCADE,
    paper_id     text REFERENCES papers (id),
    target_id    uuid,
    read_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Bell dropdown and /notifications, newest first
CREATE INDEX notifications_recipient_created_idx ON notifications (recipient_id, created_at DESC);
-- Unread badge count
CREATE INDEX notifications_unread_idx ON notifications (recipient_id) WHERE read_at IS NULL;
