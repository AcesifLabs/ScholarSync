# Scholarsync — Feature Requirements

**Product Vision:** A collaborative academic research platform that helps researchers, students, and teams discover, organize, annotate, and discuss academic papers — from first search to shared insight.

---

## 1. Paper Discovery & Search

### 1.1 Core Search
- Full-text search across paper titles, abstracts, authors, keywords, and DOIs
- Instant search with query suggestions and autocomplete (author names, journal names, topic keywords)
- Support for natural-language queries ("papers about transformer attention mechanisms after 2021")
- Boolean operators: AND, OR, NOT, phrase matching with quotes

### 1.2 Search Filters & Facets
- Filter by publication year range (slider-based)
- Filter by author, institution, or research group
- Filter by journal, conference, or publisher
- Filter by field of study / discipline taxonomy
- Filter by citation count (minimum threshold)
- Filter by open-access availability
- Filter by paper type (review, empirical, meta-analysis, preprint, etc.)

### 1.3 Search Data Sources
- Aggregated indexing from Semantic Scholar, arXiv, PubMed, CrossRef, OpenAlex, and IEEE Xplore
- Direct import by DOI, arXiv ID, PubMed ID, or full URL
- Browser extension to save any paper from the web directly to Scholarsync with one click

### 1.4 Search Results Display
- Results sorted by relevance, recency, or citation count (user-selectable)
- Paper cards showing: title, authors, year, venue, abstract excerpt, citation count, and open-access badge
- Quick-save button on each result card to add to a reading list
- "More like this" button on each result

---

## 2. Citation Graph View

### 2.1 Spider Web Graph
- Visualize a paper's citation network as an interactive node-link graph
- Nodes represent papers; edges represent citation relationships (cites / cited-by)
- Direction and edge weight encoded visually (line weight = citation frequency)
- Nodes colored by discipline, publication decade, or citation count (user-selectable legend)

### 2.2 Graph Controls
- Adjustable depth (1–4 hops from the seed paper)
- Toggle between "papers that cite this" and "papers this cites" directions, or show both
- Zoom, pan, and drag-to-rearrange layout
- Search/filter within the graph by author, year, or keyword to highlight matching nodes
- Mini-map for large graphs

### 2.3 Node Interactions
- Hover to preview paper title, authors, year, and abstract snippet
- Click to open a paper detail panel without leaving the graph
- Right-click context menu: Add to reading list, View full paper, Expand node's citations
- Highlight shortest path between any two selected nodes

### 2.4 Graph Export & Sharing
- Export graph as PNG, SVG, or interactive HTML embed
- Share a live link to a specific graph view (preserving depth, seed paper, and layout)
- Identify and highlight "bridge papers" — nodes that connect otherwise disconnected clusters

---

## 3. Reading Lists

### 3.1 List Management
- Create multiple named reading lists (e.g., "PhD Literature Review", "ML Papers Q3")
- Nest lists inside folders for hierarchical organization
- Duplicate, merge, or archive lists
- Public, shared, or private visibility per list

### 3.2 Paper Management within Lists
- Add papers from search, graph view, or direct import
- Reorder papers via drag-and-drop
- Assign a reading status per paper: **To Read → In Progress → Done**
- Add per-paper notes within a list (separate from PDF annotations)
- Tag papers with custom labels (e.g., "foundational", "needs re-read", "cite in chapter 2")
- Bulk actions: move, remove, tag, or change status for multiple papers at once

### 3.3 Smart Lists
- Auto-generated "Recommended" list based on reading history and topics
- "Recently Added" and "In Progress" smart views
- "Highly Cited in My Lists" — surfaces papers frequently cited by papers you've already saved

### 3.4 Import & Export
- Import paper lists from BibTeX, RIS, or CSV files
- Export any list to BibTeX, RIS, APA reference list, or Markdown
- One-click integration to export citations to Zotero or Mendeley

---

## 4. Reading Groups

### 4.1 Group Creation & Management
- Create a named reading group with an optional description and topic tags
- Invite members by email or username; shareable invite link with optional expiry
- Role system: **Owner, Admin, Member, Viewer**
  - Owner: full control, delete group
  - Admin: manage members, add/remove papers
  - Member: annotate, comment, add papers
  - Viewer: read-only access to papers and annotations

### 4.2 Group Paper Library
- Shared library of papers added by any group member
- Paper proposals: members can suggest papers for group review, requiring admin approval
- Voting / thumbs-up on proposed papers to prioritize the reading queue
- Assign papers to specific members for presentation or summary duties

### 4.3 Group Activity Feed
- Chronological feed of group activity: papers added, annotations made, comments posted, new members joined
- Filter feed by member or paper
- @mention specific members in comments and annotations; they receive a notification

### 4.4 Group Discussion
- Threaded discussion board per paper within the group (separate from inline PDF annotations)
- Markdown-supported comments with code blocks, math (LaTeX), and image embeds
- Pin important comments to the top of a thread
- Reactions on comments (👍 ❓ 💡 etc.)

### 4.5 Scheduled Reading Sessions
- Schedule a group reading session with a date, time, and linked paper
- Calendar view of upcoming sessions
- Session notes: a shared live document attached to each session for collaborative note-taking
- Integration with Google Calendar and Outlook for invites

---

## 5. PDF Viewer & Annotation

### 5.1 PDF Rendering
- In-app PDF viewer with smooth rendering, text selection, and search
- Side-by-side view: PDF on one side, annotation thread panel on the other
- Continuous scroll and paginated view modes
- Zoom controls, fit-to-width, fit-to-page
- Keyboard shortcuts for navigation (J/K for next/prev page, F for fullscreen)

### 5.2 Annotation Tools
- **Highlight** — multiple colors, each mappable to a meaning (e.g., yellow = key claim, green = evidence, red = disagreement)
- **Text comment** — attach a note to any highlighted region
- **Freehand drawing** — pen and marker tools for circling or annotating figures and equations
- **Text box** — place a floating text note anywhere on the page
- **Arrow / pointer** — draw directional arrows between elements
- **LaTeX equation** — insert formatted math into annotation text

### 5.3 Annotation Visibility & Collaboration
- All group members' annotations visible by default (with color-coded author attribution)
- Toggle to show/hide annotations by specific member or annotation type
- Reply to any annotation to create a thread
- Resolve annotation threads (marks as reviewed without deleting)
- Annotation timestamps and edit history

### 5.4 Personal vs. Group Annotations
- Users can mark individual annotations as **Private** (only visible to themselves) or **Group** (visible to all group members)
- Private annotations sync across the user's own devices

### 5.5 Annotation Export
- Export annotations for a paper as a structured PDF (highlights + comments overlaid), Markdown, or JSON
- Generate a reading summary: a compiled document of all highlighted text and comments, ordered by page

---

## 6. AI-Powered Features

### 6.1 Paper Summarization
- One-click AI summary of any paper: abstract-level, section-by-section, or "key findings only"
- "Explain like I'm a student" mode for simplified summaries of technical papers
- Comparative summary: "How does this paper differ from [another paper]?"

### 6.2 Intelligent Search Enhancement
- Semantic search: find conceptually related papers even without exact keyword matches
- Query expansion: suggest related terms and synonyms to broaden a search
- "Find papers that contradict this" — surfaces work with opposing conclusions

### 6.3 Annotation Assistance
- Highlight a passage and ask: "Summarize this", "Explain this term", "Does this claim appear elsewhere?"
- AI suggests tags for newly added papers based on content
- Auto-generate a reading list from a research question or thesis statement

### 6.4 Research Gap Detection
- Analyze a reading list and surface under-explored areas or missing foundational works
- "What should I read next?" — personalized next-paper recommendations based on current list and reading history

---

## 7. Author & Journal Tracking

### 7.1 Author Profiles
- Deduplicated author pages aggregating all their indexed papers
- Follow authors to receive notifications when they publish new papers
- Co-author network visualization for any author

### 7.2 Journal & Conference Watchlists
- Follow specific journals or conferences
- Receive notifications for new issues or accepted papers in your tracked venues
- View acceptance rates, impact factors, and field rankings for tracked venues

### 7.3 Citation Alerts
- Get notified when a paper in your reading list is newly cited
- Weekly digest option for citation alerts

---

## 8. User Profile & Personalization

### 8.1 Profile
- Public profile showing: name, institution, research interests, reading lists marked as public
- ORCID and Google Scholar profile linking
- Activity stats: papers read, annotations made, groups joined

### 8.2 Recommendations Feed
- Personalized home feed of recommended papers based on saved papers, reading history, and followed authors
- "Trending in your field" section updated weekly
- Ability to tune recommendations by indicating fields to include/exclude

### 8.3 Reading Progress & Stats
- Dashboard showing reading streak, papers completed per month, and time-spent estimates
- Topic distribution chart of papers read (visualized as a tag cloud or donut chart)
- Annotation activity heatmap (similar to GitHub contributions)

---

## 9. Notifications & Communication

### 9.1 Notification Center
- In-app notification feed for: new papers in groups, replies to annotations, @mentions, citation alerts, author new publications
- Email digest options: real-time, daily, or weekly rollup
- Push notifications for mobile app

### 9.2 Direct Messaging
- 1:1 messaging between users for paper sharing and discussion
- Share a paper or annotation directly into a DM thread

---

## 10. Offline & Mobile

### 10.1 Paper Downloads
- Download PDFs for offline reading and annotation
- Offline annotations sync automatically when the connection is restored
- Download an entire reading list as a zip of PDFs

### 10.2 Mobile App (iOS & Android)
- Full reading list management, search, and PDF viewing
- Mobile-optimized annotation tools (touch-based highlighting and drawing)
- Push notifications for group activity and alerts

### 10.3 Browser Extension
- Save papers to Scholarsync from any web page with one click
- Auto-detect DOI or arXiv ID on the current page and offer to import
- Access reading list and annotation notes from a side panel within the browser

---

## 11. Platform & Integration

### 11.1 Third-Party Integrations
- **Zotero & Mendeley** — bidirectional sync for paper libraries
- **Notion & Obsidian** — export reading notes and annotations as structured markdown
- **Slack** — group activity bot: post reading session reminders and newly added papers
- **Google Calendar / Outlook** — sync scheduled reading sessions

### 11.2 API & Embeds
- Public API for developers to query reading lists, paper metadata, and annotations
- Embeddable citation graph widget for personal or lab websites
- LMS integrations (Canvas, Moodle) for educators assigning reading lists to students

### 11.3 Authentication
- Sign up/login via email+password, Google, ORCID, or institutional SSO (SAML/LDAP)
- Two-factor authentication (TOTP or email OTP)

---

## 12. Admin & Moderation (for institutions / teams)

- Institutional workspace: a private Scholarsync environment for a university department or research lab
- Admin dashboard: manage members, usage analytics, billing, and group visibility
- Content moderation tools for reading group admins (flag/remove inappropriate annotations or comments)
- Audit log for institutional workspaces

---

## Feature Priority Matrix

| Feature Area | Core MVP | Phase 2 | Phase 3 |
|---|---|---|---|
| Paper Search & Filters | ✅ | | |
| Citation Graph View | ✅ | | |
| Reading Lists | ✅ | | |
| PDF Viewer | ✅ | | |
| Basic Annotations (highlight, comment) | ✅ | | |
| Reading Groups | ✅ | | |
| Group Annotation Visibility | ✅ | | |
| AI Paper Summarization | | ✅ | |
| Author Following & Alerts | | ✅ | |
| Advanced Annotation Tools (drawing, LaTeX) | | ✅ | |
| Mobile App | | ✅ | |
| Browser Extension | | ✅ | |
| Research Gap Detection | | | ✅ |
| Institutional Workspace & SSO | | | ✅ |
| API & Embeds | | | ✅ |
| LMS Integration | | | ✅ |

---

*Document version 1.0 — Scholarsync Product Requirements*
