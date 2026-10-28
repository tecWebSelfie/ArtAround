---
version: 1
slug: "src-app-lng-frontend-layout-tsx"
primary_target: "src/app/[lng]/(frontend)/layout.tsx"
related_targets: []
---

# Desktop visitor experience (everything but the marketplace)

Mode: Operate. Established world (DESIGN.md): this is an adaptation, not a new visual identity. Assumptions below were inferred from the codebase because the user delegated every decision ("fai tutto te") and will review the finished work.

## Job and audience
- Visitors on a laptop or desktop: planning a visit at home, browsing museums/tours/contents before going, reading content after a visit, a teacher preparing a group tour, staff checking their museums. Mouse + keyboard, seated, 1280–1920px wide.
- The phone stays the in-museum device. Desktop is browse, plan, read, and also a full map visit (kiosks, remote visits).

## Outcome
- Every visitor surface reads as built for a wide screen at ≥ md (62em / 992px): no phone column floating in white space, no bottom tab bar, no 600px-tall placeholder image pushing the content below the fold.
- Below md nothing changes: the mobile layout is the incumbent and stays pixel-identical.

## Selected direction
- **One persistent top bar on desktop** (≥ md) replaces the bottom tab bar: the ArtAround wordmark, the tab entries (Navigator, Marketplace, My museums) as horizontal links, and at the trailing edge the language switch, museum switch and account menu (menus open downward). It is shown on every browsing page (tabs, museum, object, content, tour, search, profile, plan, auth, quiz, checkout, room) and hidden on immersive full-viewport surfaces (tour/free map navigation, QR scan, map editor), which own their own chrome.
- **Detail pages become two-pane at ≥ md**: media and identity on one side, facts and actions on the other, with the media pane sticky where the other pane scrolls. Width caps at a readable container (≤ 1200px); prose keeps a 65–75ch measure.
- **Actions move into the page at ≥ md**: footers that exist for thumb reach (tour page action pair) become inline actions in the summary pane; the Thumb-Reach Rule stays for phones.
- **Map navigation on desktop**: the map stays the loudest thing; contextual content opens in a right-side panel beside the map (same routes, same URLs) instead of a centered modal covering it; the floating controls cluster instead of spreading across 1280px; the directions strip keeps its slot with a bounded width.
- **Navigator home on desktop**: hero + search in a bounded column, then the three ways to begin a visit (scan a QR, plan a visit, join a group) as one row of equal columns, not stacked.

## Scope and boundaries
- In: shell/top bar, navigator home, museum/object/content/tour/tour-start/profile detail pages, search result pages, plan my visit, quiz and results, auth, checkout outcomes, group room, tour + free map navigation.
- Out: the marketplace page (a colleague owns it). The shared top bar does link to it and replaces its bottom bar at desktop, nothing inside marketplace/ changes. Staff map editor and editing forms: untouched except where they break.
- Anti-goals: no new colors, fonts, gradients, or decorative motion (Scoped Playfulness Rule); no card grids as page structure; no eyebrows; no modal-first patterns; no change of URLs or route structure; no new libraries.

## States and ranges
- Missing images (PLACEHOLDER_IMAGE) are common: a placeholder must never dominate a desktop viewport (cap media height).
- Long titles (50+ chars, all EU languages: German/Finnish/Hungarian run long), 0–40 tour stops, 0–200 search results, signed in/out, with/without museum roles, museum mode on/off, group guest vs host.

## Interaction and layout
- Breakpoint: Mantine `md` via `visibleFrom`/`hiddenFrom` and responsive style props. Content container `size="lg"`/max 1200px, centered, `xl` gutters.
- Hover states on desktop links/rows (Mantine defaults), visible focus rings, keyboard reachable menus, `/` or mod+K opens the map search where Spotlight is present.

## Constraints
- Mantine 9 + Tailwind v4 as already used; the Overlay Opt-In Rule, Single Marker Table, Triplet Rule, Follow-the-Host Rule and shareable modal URLs all hold.
- Every new string translated into all 24 locale folders (no extract run by sub-builders).
- Storybook MCP is offline in this session; component props are checked against Mantine's type definitions in node_modules.
