# ScholarSync glossary

- **Paper**: one work merged from every source that knows it, stored in `papers`. Its id is `doi:…`, `arxiv:…`, `pmid:…` or `openalex:W…` (ADR 0005).
- **Source**: an external metadata API: OpenAlex, Crossref, Europe PMC, arXiv, OpenCitations or Unpaywall. A paper lists the sources that contributed to it.
- **Merged record**: the result of combining the sources' descriptions of one paper, taking the most informative value per field.
- **Search cache**: stored results of a search, reused for later searches with the same filters and sort and the same or very similar text.
- **Library**: every paper a user has saved. Each library item has a **reading status**: To Read, In Progress or Done.
- **Collection**: a named, ordered reading list owned by one user. Adding a paper to a collection also saves it to the Library.
- **Archive**: archived collections and archived library papers. Archiving hides an item from Library and Collections. It does not delete it.
- **Reading group**: users who share a group library, discussions and annotations. Roles, highest first: Owner, Admin, Member, Viewer.
- **Annotation**: a highlight on a paper's PDF, with an optional comment. Visibility is Private (author only) or Group (members of one reading group).
- **Activity**: an event row in a reading group's feed.
- **Notification**: an event row addressed to one user.
- **Focus mode**: the reader's full-screen layout, without the app sidebar.
- **Last page**: the PDF page where a user last stopped reading a paper in their Library. "Continue reading" reopens the reader there.
