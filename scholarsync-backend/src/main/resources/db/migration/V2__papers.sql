CREATE TABLE papers (
    id                  text PRIMARY KEY,
    title               text NOT NULL,
    authors             jsonb NOT NULL DEFAULT '[]',
    year                int,
    venue               text,
    abstract            text,
    citation_count      int,
    reference_count     int,
    fields_of_study     text[] NOT NULL DEFAULT '{}',
    publication_types   text[] NOT NULL DEFAULT '{}',
    open_access_pdf_url text,
    external_ids        jsonb,
    uploaded_pdf_key    text,
    uploaded_by         uuid REFERENCES users (id) ON DELETE SET NULL,
    fetched_at          timestamptz NOT NULL DEFAULT now()
);
