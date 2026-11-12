-- Positions renumbered by V10 stay renumbered; their order is unchanged.
CREATE INDEX collection_papers_position_idx ON collection_papers (collection_id, position);
ALTER TABLE collection_papers DROP CONSTRAINT collection_papers_position_key;

DROP INDEX IF EXISTS annotation_replies_author_idx, group_comments_parent_idx, group_comments_author_idx,
    group_activity_actor_idx, notifications_actor_idx, notifications_group_idx;
