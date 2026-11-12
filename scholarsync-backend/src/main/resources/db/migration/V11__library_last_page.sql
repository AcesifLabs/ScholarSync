-- PDF page where the user last stopped reading; null until the reader saves one.
ALTER TABLE library_items ADD COLUMN last_page integer CHECK (last_page >= 1);
