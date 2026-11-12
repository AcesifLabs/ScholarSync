-- Not fully reversible: paper ids stay in the doi:/arxiv:/pmid: form. The old Semantic Scholar ids are not kept,
-- and they are useless without Semantic Scholar access.
DROP TABLE IF EXISTS search_cache;

ALTER TABLE library_items DROP CONSTRAINT library_items_paper_id_fkey,
    ADD CONSTRAINT library_items_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id);
ALTER TABLE collection_papers DROP CONSTRAINT collection_papers_paper_id_fkey,
    ADD CONSTRAINT collection_papers_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id);
ALTER TABLE annotations DROP CONSTRAINT annotations_paper_id_fkey,
    ADD CONSTRAINT annotations_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id);
ALTER TABLE group_papers DROP CONSTRAINT group_papers_paper_id_fkey,
    ADD CONSTRAINT group_papers_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id);
ALTER TABLE group_comments DROP CONSTRAINT group_comments_paper_id_fkey,
    ADD CONSTRAINT group_comments_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id);
ALTER TABLE notifications DROP CONSTRAINT notifications_paper_id_fkey,
    ADD CONSTRAINT notifications_paper_id_fkey FOREIGN KEY (paper_id) REFERENCES papers (id);

DROP INDEX IF EXISTS papers_doi_key, papers_arxiv_id_key, papers_pmid_key, papers_openalex_id_key;
ALTER TABLE papers DROP COLUMN doi, DROP COLUMN arxiv_id, DROP COLUMN pmid, DROP COLUMN openalex_id, DROP COLUMN sources;
