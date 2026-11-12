ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
UPDATE notifications SET type = 'REPLY' WHERE type IN ('ANNOTATION_REPLY', 'COMMENT_REPLY');
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('GROUP_ADDED', 'REPLY', 'GROUP_PAPER_ADDED'));
