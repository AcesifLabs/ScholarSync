# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyone who reads academic papers seriously, alone or with others:
- graduate students doing literature reviews and lab reading groups;
- academic researchers (faculty, postdocs, lab members) tracking their field;
- industry R&D researchers and engineers following papers for work;
- undergraduates and self-learners reading papers for coursework or interest.

The job: find the right papers, keep track of them, read and annotate them closely, and discuss them with a reading group.

## Product Purpose

ScholarSync puts the whole paper workflow in one place: search, organise, read and annotate, and discuss with a group. People should not need to switch between a search engine, a reference manager, a PDF reader and a chat thread. Success means a researcher can go from a query to a shared, annotated, discussed paper without leaving the app.

## Positioning

All four parts are core; none is a side feature:
- **Search**: one query searches OpenAlex, Crossref, Europe PMC and arXiv. The results are merged into one de-duplicated record per DOI that keeps the most informative value for each field, and a list of sources is shown on each paper.
- **Personal library**: a library with reading statuses, ordered collections with notes and tags, an archive, share links, and BibTeX/Markdown export.
- **Reading and annotation**: an in-app PDF reader with coloured highlights, comment threads and Markdown export.
- **Group reading**: reading groups with roles, a shared library, group annotations, threaded discussion per paper, and an activity feed.

## Operating Context

- People read in long sessions, mostly on laptops and desktops.
- The core routes are:

  | Route | Purpose |
  |---|---|
  | `/` | Dashboard |
  | `/search` | Search |
  | `/paper/{id}` | Paper detail |
  | `/paper/{id}/read` | Reader |
  | `/paper/{id}` citation graph | Citation graph |
  | `/library` | Library |
  | `/collection` | Collections |
  | `/archive` | Archive |
  | `/groups` | Reading groups |
  | `/researchers` | Researcher profiles |
  | `/notifications` | Notifications |
  | `/shared/{token}` | Public shared collection |
- Sign-in is through Google only.
- PDFs come either from open-access sources (proxied by the backend) or from a user upload.

## Capabilities and Constraints

- **Domain vocabulary** is defined in `CONTEXT.md`: Paper, Source, Merged record, Search cache, Library, Reading status, Collection, Archive, Reading group, Annotation, Activity, Notification. Use these terms in the UI copy.
- **Data sources:** metadata comes only from free sources that permit commercial use. Unpaywall is behind a flag. Never imply access to paywalled full text.
- **Group roles,** highest first: Owner, Admin, Member, Viewer. Permissions differ per role, and the UI must reflect them.
- **Stack:** Next.js 16, React 19, Tailwind CSS 4 and shadcn/ui (Base UI) on the frontend; Spring Boot 4 on the backend.
- **Undecided:** pricing, a logo and a voice guide.

## Brand Commitments

- **Name:** ScholarSync.
- **Visual system:** the category standard, played straight (no themed world). The quality bar is Linear, Semantic Scholar, Readwise Reader and Zotero 7. See `docs/adr/0006-category-standard-visual-system.md`.
- **Primary platform:** the desktop. Design first for long reading and annotation sessions on laptops and desktops. Mobile is secondary but must still work.

## Evidence on Hand

- **Docs:** product facts are in `README.md`, the glossary in `CONTEXT.md`, and architecture decisions in `docs/adr/`.
- **Not yet available:** no testimonials, user counts, logos of institutions or press exist. Do not invent them.

## Product Principles

1. **One workflow, no tool-switching.** Every surface should lead naturally to the next step: from search to library, to reading, to the group.
2. **Reading comes first.** Long, focused reading and annotation sessions set the bar. Nothing should interrupt or jolt the reader.
3. **Be honest about the data.** Show where metadata came from and what is missing. Never overstate coverage or access.
4. **Together without friction.** Group features should feel as direct as reading alone, and roles should be clear rather than in the way.

## Accessibility & Inclusion

The required standard is WCAG 2.2 AA across the app, including the PDF reader, the annotation tools, drag-and-drop ordering and the citation graph. Each of these needs keyboard and screen-reader paths.
