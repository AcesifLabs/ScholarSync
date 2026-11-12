---
name: ScholarSync
description: Find, organise, read and discuss academic papers in one place.
colors:
  ink-indigo: "oklch(0.47 0.17 272)"
  ink-indigo-foreground: "oklch(0.99 0 0)"
  focus-indigo: "oklch(0.55 0.17 272)"
  cool-paper: "oklch(0.993 0.002 265)"
  chrome-surface: "oklch(0.975 0.004 265)"
  card-white: "oklch(1 0 0)"
  slate-ink: "oklch(0.21 0.02 268)"
  muted-slate: "oklch(0.5 0.02 265)"
  quiet-fill: "oklch(0.962 0.006 265)"
  secondary-fill: "oklch(0.955 0.007 265)"
  selected-fill: "oklch(0.948 0.01 268)"
  hairline: "oklch(0.91 0.006 265)"
  control-outline: "oklch(0.64 0.015 265)"
  recent-wash: "oklch(0.96 0.03 272)"
  open-green: "oklch(0.5 0.13 150)"
  danger-red: "oklch(0.53 0.2 27)"
  highlight-key-claim: "oklch(0.88 0.17 95 / 0.42)"
  highlight-evidence: "oklch(0.84 0.15 150 / 0.4)"
  highlight-disagreement: "oklch(0.74 0.16 25 / 0.38)"
  highlight-question: "oklch(0.78 0.11 250 / 0.4)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"cv11\", \"ss03\", \"tnum\""
  reading:
    fontFamily: "Source Serif 4, ui-serif, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "\"pnum\""
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "3.6px"
  md: "4.8px"
  lg: "6px"
  xl: "8.4px"
  4xl: "15.6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink-indigo}"
    textColor: "{colors.ink-indigo-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.cool-paper}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline-hover:
    backgroundColor: "{colors.quiet-fill}"
  button-ghost:
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-ghost-hover:
    backgroundColor: "{colors.quiet-fill}"
  input:
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  search-field:
    backgroundColor: "{colors.cool-paper}"
    rounded: "{rounded.lg}"
    height: "36px"
  chip:
    backgroundColor: "{colors.secondary-fill}"
    textColor: "{colors.slate-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    height: "20px"
    padding: "2px 8px"
  nav-item:
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 10px"
  nav-item-active:
    backgroundColor: "{colors.selected-fill}"
    textColor: "{colors.slate-ink}"
  paper-row:
    padding: "16px 0"
  surface-pane:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: ScholarSync

## Overview

**Creative North Star: "The Quiet Instrument"**

ScholarSync is a precise research tool in the register of Linear, Semantic Scholar, Readwise Reader and Zotero 7. The interface stays out of the way of the papers: cool neutrals tinted toward one hue (about 265), one ink-indigo accent that marks only the primary action, Inter for the working interface and Source Serif 4 for anything meant to be read. Density is desktop-first and calm: a 48px top bar, a collapsible icon sidebar, and content laid out as hairline-divided lists with tabular metadata.

Nothing is ornamental. Depth is flat at rest, structure comes from 1px hairlines, and color carries meaning wherever it appears: indigo means "the main thing to do here", green means "openly available", the four highlight colours mean the same thing to every reader in a group. The PDF page is the one piece of real paper in the app and stays white in both themes.

The world rejects the stock SaaS look: no hero illustration, no grids of icon-tile cards, no decorative gradients. Light and dark themes are both first-class and are defined from the same hue.

**Key Characteristics:**
- One hue (about 265) tints every neutral in both themes.
- Ink-indigo appears only on primary actions, selection, caret and focus.
- Hairline-divided lists, not bordered cards, for collections of records.
- Inter with tabular figures for UI; Source Serif 4 at 66ch for reading.
- 6px controls, about 8px surfaces, one focus ring.
- Flat at rest; shadows only on layers that float.

## Colors

A cool, near-monochrome slate palette with a single ink-indigo voice and a small set of semantic colours that each carry one meaning.

### Primary
- **Ink Indigo** (ink-indigo): the fill of the one primary action on a screen: Read PDF on the paper page, the Search button, the landing sign-in CTA. Also the link colour inside reading text, the text caret, the active sidebar icon, and (at 22% mix) text selection. In dark mode it lifts to oklch(0.73 0.13 274) with dark text on it.
- **Focus Indigo** (focus-indigo): the global focus ring. Slightly lighter than Ink Indigo so it reads against both primary buttons and paper.

### Neutral
- **Cool Paper** (cool-paper): the page background.
- **Chrome Surface** (chrome-surface): the top bar, sidebar and reader side panel; one step darker than the page so the chrome recedes.
- **Card White** (card-white): popovers, dialogs and the rare standalone pane.
- **Slate Ink** (slate-ink): body text and titles. Authors sit at 80% of it; reading text at 90%.
- **Muted Slate** (muted-slate): metadata, descriptions, section labels, placeholders.
- **Quiet Fill / Secondary Fill / Selected Fill**: hover fills, chip and segmented-control backgrounds, and the active nav item. They differ by a hair and never carry colour.
- **Hairline** (hairline): every divider and decorative border. Decorative only; it is not required to reach 3:1.
- **Control Outline** (control-outline): the border of inputs, selects and checkboxes. It must reach 3:1 against the background, which is why it is much darker than Hairline.
- **Recent Wash** (recent-wash): a faint indigo wash on rows that changed recently (unread replies, new annotations) and on the sign-in-required notice.

### Semantic
- **Open Green** (open-green): "PDF" and "Open access" in metadata, and success states. Nothing decorative.
- **Danger Red** (danger-red): destructive actions and errors, used as a tinted text-on-wash (10% fill) rather than a solid red button.

### Annotation highlights
Translucent highlighter washes so the text stays legible through them. Each colour has one fixed meaning shared by everyone in a reading group:
- **Key claim** (highlight-key-claim, yellow)
- **Evidence** (highlight-evidence, green)
- **Disagreement** (highlight-disagreement, red)
- **Question** (highlight-question, blue)

In dark mode the alpha rises (to about 0.5) so the chips read on dark panels while still reading as highlighter on the paper-white PDF page.

### Named Rules
**The One Voice Rule.** Ink Indigo fills at most the one primary action on a screen (Read PDF, Search, the landing CTA). Row-level actions such as "Read" are outline buttons, even when there are many of them.

**The Colour Means Something Rule.** Every non-neutral colour carries a fixed meaning: indigo is the primary action, green is open availability or success, red is destruction or error, and the four highlight colours are Key claim, Evidence, Disagreement and Question. Never pick a colour for decoration.

**The Two Borders Rule.** Hairline separates content and may be faint. Control Outline marks an interactive boundary and must reach 3:1.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui)
**Body Font:** Inter (with ui-sans-serif, system-ui)
**Reading Font:** Source Serif 4 (with ui-serif, Georgia)

**Character:** Inter does the working interface with `cv11` and `ss03` and tabular figures, so years, counts and page numbers align in columns. Source Serif 4 takes over wherever a person reads for meaning: abstracts, notes, discussion and annotation comments.

### Hierarchy
- **Display** (600, 2.25rem to 3rem, 1.08, tight tracking): the landing statement only, capped at 18ch.
- **Headline** (600, 1.5rem, tight tracking): page titles in the page header. A paper title on its own page goes to 1.75rem on desktop and is capped at 40ch.
- **Title** (600, 1rem, 1.375): paper titles in list rows, which link to the paper.
- **Body** (400, 0.875rem): the default UI size for nearly everything: authors, descriptions, controls, nav. Inputs are 1rem on mobile to avoid zoom.
- **Reading** (400, 1.0625rem, 1.6, max 66ch, proportional figures): abstracts, notes, discussion and comments. Links are indigo and underlined.
- **Label** (500 or 400, 0.75rem): metadata lines, sidebar section labels, stat captions, chips. Sentence case, no tracking.

### Named Rules
**The Two Voices Rule.** Sans for operating, serif for reading. Any long-form text a person reads for meaning uses the reading style at 66ch; nothing else uses the serif.

**The Tabular Figures Rule.** UI numbers are tabular by default; only reading text switches to proportional figures.

## Layout

Desktop-first app shell: a 48px top bar on Chrome Surface (wordmark, centred search up to 36rem, notifications, account), a sidebar of 224px that collapses to a 56px icon rail (state remembered per browser), and a content column centred at max 72rem with 16px gutters on mobile and 32px from md up. Under md the sidebar becomes a left sheet behind a menu button and the bar's search becomes an icon.

Vertical rhythm is built from a 4px base: 24px between page blocks, 16px of padding inside each list row, 6px between a row's lines, 8px between inline actions. The landing page opens up to 64px between sections and sets its statement beside a 26rem column of real workflow panes on large screens.

Content measure is capped everywhere: reading text at 66ch, row abstracts at 80ch and clamped to two lines, page descriptions at about 42rem.

## Elevation & Depth

Flat by default. Surfaces at rest have no shadow; hierarchy comes from the Chrome Surface step, hairlines and type weight. Shadows appear only on things that float above the page: popovers, menus, dialogs, sheets, the reader's overlay side panel, and a row while it is being dragged.

### Shadow Vocabulary
- **Float** (Tailwind `shadow-lg`): menus, search suggestions, highlight popover, sheets, a dragged row.
- **Overlay panel** (Tailwind `shadow-xl`): the reader's annotation panel when it overlays the page.
- **Paper** (Tailwind `shadow-sm` plus a 1px 10% black ring): PDF pages in the reader, and the selected thumb of a segmented control.

### Named Rules
**The Flat-At-Rest Rule.** If it does not float, it does not cast a shadow.

**The Paper Stays White Rule.** PDF pages render on pure white in both themes; the dark theme darkens the chrome around the page, never the page.

## Shapes

Small, consistent corners derived from one 6px base radius: 6px on controls (buttons, inputs, selects, the search field), about 8px on surfaces (dialogs, standalone panes, error and auth panels), about 5px on nav items and segmented options, about 4px on inline marks and code, and a full pill only on chips. Borders are 1px everywhere. Lists are open: rows are separated by hairlines with a hairline above and below the list, and have no side borders or corner radius.

## Components

### Buttons
Restrained and compact; the variant tells you how important the action is.
- **Shape:** 6px radius, 32px tall (28px small, 36px large), medium-weight body text, 16px icons.
- **Primary:** Ink Indigo fill, white text. One per screen (see The One Voice Rule).
- **Outline:** page background with a hairline border; hover fills with Quiet Fill. The default for row-level and secondary actions ("Read", "Sign in to save", "Citation graph").
- **Ghost:** no fill until hover. Toolbar icons, the secondary landing link, menu triggers.
- **Destructive:** red text on a 10% red wash, never a solid red fill.
- **Press:** non-menu buttons shift down 1px when active. Disabled is 50% opacity.

### Chips
- **Style:** Secondary Fill pill, 20px tall, 0.75rem medium text (subjects, "Merged from" sources). An outline variant uses a hairline instead of fill.
- **State:** chips are labels, not filters; filters use the segmented control or selects.

### Segmented control
A Quiet Fill track with 3px inset; the selected option sits on the page background with a Paper shadow, others are muted text. Arrow keys move the selection like radios.

### Cards / Containers
- **Corner Style:** about 8px.
- **Background:** Card White.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** one hairline.
- **Internal Padding:** 16px (32px for a centred standalone panel).
- **Use:** a single standalone thing (a dialog, an error panel, a landing example pane). Never as a repeated list item.

### Inputs / Fields
- **Style:** 32px tall, 6px radius, Control Outline border, transparent fill (a 30% control-outline wash in dark mode).
- **Focus:** the global focus ring. The search field is a composite: its inner input drops its own outline and the shell takes the ring (2px Focus Indigo plus a Focus Indigo border), so the ring wraps the icon and button too.
- **Error / Disabled:** red border with a faint red ring; disabled is 50% opacity.

### Navigation
- **Top bar:** 48px, Chrome Surface, hairline bottom border.
- **Sidebar:** sentence-case 0.75rem muted section labels ("Discover", "Your work"), then 32px items with a 16px icon and body text at 75% ink. Hover fills with 70% Selected Fill; the active item has the full Selected Fill, medium weight, and an indigo icon. Collapsed mode shows icons only with tooltips.
- **Mobile:** the same nav inside a left sheet.

### Paper row (signature)
The core unit of the app. A row is: title (Title style, links to the paper), authors (body, 80% ink, first three then "et al."), one metadata line (Label, muted: year, venue, citation count, a green "PDF" or "Open access", and "via" the merged sources), an optional two-line abstract, then outline actions. Rows stack inside a hairline-divided list with 16px vertical padding.

### Undo toast
Reversible removals (unsave, archive, remove from collection) apply immediately in the UI and show a bottom-right toast with an Undo action. The server commit is deferred for 5 seconds and dropped if the person undoes. Irreversible actions use a confirm dialog instead.

### Annotation highlight
A translucent highlighter wash in one of the four meaning colours, with the meaning's name as its label wherever the highlight is listed ("Key claim · comment…").

### Focus ring
One rule for every focusable element: a 2px Focus Indigo outline at 2px offset on `:focus-visible`. Primitives do not add their own focus rings.

### Motion
Short state transitions on colour and background. Enter and exit animations fade with a slight slide or zoom; under reduced motion the fade stays (it carries the state change) and the slide, zoom and rotation are removed.

## Do's and Don'ts

### Do:
- **Do** reserve the Ink Indigo fill for the one primary action on a screen: Read PDF, Search, the landing CTA.
- **Do** make row-level actions outline buttons, even "Read".
- **Do** present collections of records as hairline-divided lists with 16px row padding.
- **Do** set every long-form text a person reads in the reading style: Source Serif 4, 1.0625rem, 1.6, max 66ch.
- **Do** rely on the single global focus ring (2px Focus Indigo, 2px offset); on a composite field, move it to the shell.
- **Do** use 6px corners on controls and about 8px on surfaces.
- **Do** keep PDF pages white in dark mode.
- **Do** label annotation colours by their meaning: Key claim, Evidence, Disagreement, Question.
- **Do** give reversible removals an Undo toast with a 5-second deferred commit.
- **Do** keep fades and drop slides and zooms when reduced motion is requested.

### Don't:
- **Don't** fill row-level or secondary actions with indigo.
- **Don't** wrap repeated list items in bordered or shadowed cards.
- **Don't** add a focus ring or glow inside a primitive; the global rule owns focus.
- **Don't** use a highlight colour for anything except its meaning.
- **Don't** add shadows to surfaces that do not float.
- **Don't** use the serif for UI labels, buttons or metadata.
- **Don't** use Hairline for control borders; controls need Control Outline at 3:1.
