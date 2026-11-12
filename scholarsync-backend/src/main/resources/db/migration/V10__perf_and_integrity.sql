-- Foreign keys that ON DELETE CASCADE / SET NULL follow when a group or a user is deleted
CREATE INDEX notifications_group_idx ON notifications (group_id);
CREATE INDEX notifications_actor_idx ON notifications (actor_id);
CREATE INDEX group_activity_actor_idx ON group_activity (actor_id);
CREATE INDEX group_comments_author_idx ON group_comments (author_id);
CREATE INDEX group_comments_parent_idx ON group_comments (parent_id);
CREATE INDEX annotation_replies_author_idx ON annotation_replies (author_id);

-- Concurrent adds could store the same position twice. Renumber 0..n-1 per collection, keeping the current order,
-- then make positions unique. Deferred to commit so a reorder can swap positions within one transaction.
UPDATE collection_papers cp
SET position = ranked.rn
FROM (SELECT collection_id, paper_id,
             row_number() OVER (PARTITION BY collection_id ORDER BY position, added_at, paper_id) - 1 AS rn
      FROM collection_papers) ranked
WHERE cp.collection_id = ranked.collection_id AND cp.paper_id = ranked.paper_id AND cp.position <> ranked.rn;

ALTER TABLE collection_papers ADD CONSTRAINT collection_papers_position_key
    UNIQUE (collection_id, position) DEFERRABLE INITIALLY DEFERRED;
-- the constraint's index serves the same lookups
DROP INDEX collection_papers_position_idx;
