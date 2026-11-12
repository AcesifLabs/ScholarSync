---
version: 1
slug: "scholarsync-frontend"
primary_target: "scholarsync-frontend"
related_targets: []
---

# Surface: ScholarSync app (scholarsync-frontend)

Scope: every app route (Operate) plus the signed-out landing page (Persuade, built in code).
Audience and job: see PRODUCT.md. Constraints: desktop first, WCAG 2.2 AA, dark mode, PDF page stays white.

## Direction contract
THESIS: A precise, quiet research tool at the level of Linear, Semantic Scholar, Readwise Reader and Zotero 7; it refuses the stock shadcn SaaS look with a hero and icon-tile cards.
OWN-WORLD: Cool-tinted neutrals with one ink-indigo accent reserved for primary actions; Inter for UI with tabular figures, Source Serif 4 for reading text at 66ch; hairline-divided lists, 6px control and 8px surface radius, one focus ring, no ornament.
STORY: A researcher finds a paper, saves it, reads and annotates it in focus mode, and discusses it with a reading group without leaving the app.
FIRST VIEWPORT: App: 48px top bar with search, collapsible icon sidebar, content in a hairline list with tabular metadata. Landing: one statement of the product beside real UI pieces of the workflow (merged result with sources, library row, highlighted passage, group thread), one Google sign-in.
FORM: canon (category standard), chosen by the user over the dealt directions; seed:efbeb0cf9c411cb1
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
