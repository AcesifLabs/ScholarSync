-- REPLY did not say whether target_id is an annotation or a group comment, so the UI could not link to it.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

UPDATE notifications SET type = 'ANNOTATION_REPLY'
WHERE type = 'REPLY' AND target_id IN (SELECT id FROM annotations);

UPDATE notifications SET type = 'COMMENT_REPLY'
WHERE type = 'REPLY';

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('GROUP_ADDED', 'ANNOTATION_REPLY', 'COMMENT_REPLY', 'GROUP_PAPER_ADDED'));
