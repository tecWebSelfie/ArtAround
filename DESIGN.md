---
name: ArtAround
description: An approachable Mantine visitor interface with small playful discovery accents, over a separate neutral staff editor layer.
colors:
  navigation-blue: '#0077d1'
  navigation-blue-hover: '#0065bd'
  tour-purple: '#7e22ce'
  tour-grape: '#9c36b5'
  tour-orange-deep: '#d9480f'
  tour-orange: '#fb923c'
  content-teal: '#12b886'
  grape: '#be4bdb'
  easy-green: '#40c057'
  medium-yellow: '#fab005'
  hard-red: '#c92a2a'
  paid-orange: '#fd7e14'
  marker-red: '#fa5252'
  exit-red: '#ff8787'
  assistant-ember: '#FF8A2A'
  voice-aura: '#1FD5F9'
  feedback-correct: '#2f9e44'
  feedback-wrong: '#e03131'
  chart-highlight: '#ff922b'
  chart-muted: '#ced4da'
  accessibility-blue: '#228be6'
  surface-light: '#ffffff'
  surface-subtle: '#f8f9fa'
  surface-dark: '#242424'
  control-dark: '#2e2e2e'
  border-dark: '#424242'
  text-dark-scheme: '#c9c9c9'
  editor-background: 'oklch(1 0 0)'
  editor-foreground: 'oklch(0.145 0 0)'
  editor-primary: 'oklch(0.205 0 0)'
  editor-border: 'oklch(0.922 0 0)'
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
    fontSize: '2.125rem'
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
    fontSize: '1.375rem'
    fontWeight: 700
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
    fontSize: '1rem'
    lineHeight: 1.55
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
    fontSize: '0.875rem'
rounded:
  xs: '0.125rem'
  sm: '0.25rem'
  md: '0.5rem'
  lg: '1rem'
  xl: '2rem'
  editor-base: '0.625rem'
spacing:
  xs: '0.625rem'
  sm: '0.75rem'
  md: '1rem'
  lg: '1.25rem'
  xl: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.navigation-blue}'
    textColor: '{colors.surface-light}'
    rounded: '{rounded.sm}'
    height: '2.25rem'
    padding: '0 1.125rem'
  button-primary-hover:
    backgroundColor: '{colors.navigation-blue-hover}'
  button-default:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.sm}'
    height: '2.25rem'
    padding: '0 1.125rem'
  card-result:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.md}'
    padding: '0.75rem'
  search:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.xl}'
    height: '3rem'
    padding: '0 1rem'
  button-unlock:
    backgroundColor: '{colors.paid-orange}'
    textColor: '{colors.surface-light}'
    rounded: '{rounded.sm}'
    height: '2.25rem'
    padding: '0 1.125rem'
  badge-locked:
    textColor: '{colors.paid-orange}'
    rounded: '{rounded.xl}'
  map-tool-icon:
    backgroundColor: '{colors.surface-light}'
    rounded: '{rounded.sm}'
    size: '44px'
  staff-row:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.md}'
    padding: '0.75rem'
  tab-active:
    textColor: '{colors.navigation-blue}'
  floating-toolbar:
    backgroundColor: '{colors.surface-light}'
    rounded: '{rounded.md}'
    padding: '0.375rem'
  directions-strip:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.md}'
  assistant-orb:
    rounded: '{rounded.xl}'
    size: '52px'
  command-pill:
    textColor: '{colors.navigation-blue}'
    rounded: '{rounded.xl}'
    height: '1.625rem'
  gps-pad:
    backgroundColor: '{colors.surface-light}'
    rounded: '{rounded.md}'
    padding: '6px'
  reading-pill:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.xl}'
    height: '1.625rem'
  reading-pill-active:
    backgroundColor: '{colors.navigation-blue}'
    textColor: '{colors.surface-light}'
  museum-switch:
    textColor: '{colors.navigation-blue}'
    rounded: '{rounded.xl}'
    height: '1.625rem'
  group-pill:
    textColor: '{colors.navigation-blue}'
    rounded: '{rounded.xl}'
    height: '1.625rem'
  room-code:
    textColor: '{colors.editor-foreground}'
    typography: 'monospace 40px/1 700, letter-spacing 0.12em'
  answer-option:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    rounded: '{rounded.md}'
    height: '3.5rem'
    padding: '0.75rem 1.625rem'
  answer-option-correct:
    textColor: '{colors.feedback-correct}'
    rounded: '{rounded.md}'
  answer-option-wrong:
    textColor: '{colors.feedback-wrong}'
    rounded: '{rounded.md}'
  footer-action:
    backgroundColor: '{colors.navigation-blue}'
    textColor: '{colors.surface-light}'
    rounded: '{rounded.sm}'
    height: '2.625rem'
    width: '100%'
  site-header:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    height: '56px'
    width: '100%'
  navigation-panel:
    backgroundColor: '{colors.surface-light}'
    textColor: '{colors.editor-foreground}'
    width: 'clamp(26.25rem, 34vw, 30rem)'
---

# Design System: ArtAround

<!-- Prototype-derived visual guidance confirmed with the user. This records the intended feel and the muscle memory of the incumbent code, not a claim that every detail is polished, accessible, or finished. Where the code is mid-refactor, the description is deliberately provisional.  2026-11-04 merge (requirements 18-33): src/components/mantine/{ContentAudioButton,DurationBadge,ObjectDetailsModal}.tsx, src/components/editing/{VisibilityInput,WikidataInput}.tsx, editing/forms/{ContentFields,ObjectMetadataForm,TourForm}.tsx, src/components/group/GroupRequests.tsx, GroupBadgePanel.tsx, content/[id]/ContentDetails.tsx (credits line, Private badge), tour/[id]/TourPage.tsx (Private badge), subject/[id]/page.tsx, expansion/{ContentExpansion,ContentVersion}.tsx; tokens unchanged; extract found no pattern used 3+ times and no hard-coded color, px value or inline style; verified through stories (no new rendered screenshots: visual tests need approval). 2026-11-05 merge (logistics, subject contents): museum/[id]/navigation/{LogisticNotes,TourNavigation}.tsx, tour/[id]/TourPage.tsx, editing/forms/{TourForm,ContentForm}.tsx, editing/ObjectPicker.tsx (NamePicker, SubjectPicker), subject/[id]/page.tsx; tokens unchanged; extract found nothing to move (the Signpost note appears in two different shapes: a tappable header row and a timeline line); rendered at Pixel 7 size through Playwright screenshots. 2026-11-10 merge (UI/UX overhaul, branch ccr-05ce6c3f): src/theme.ts (DEFAULT_PRIMARY, lightVariantText, cssVariablesResolver, TOUR_GRADIENT), globals.css badge floor, AppMantineProvider (dialog close labels), LabeledPagination, ContentGlance, TourNavigation header, StepModal cover, NavigationModal kinds, ObjectDetailsModal facts, MuseumPage info, opening hours (src/lib/opening-hours.ts), page titles and main landmarks; extract moved the dialog close label and the reading-time count into shared code (AppMantineProvider, readingMinutes) and found no other pattern used 3+ times with one intent. -->

## Overview

**Creative North Star: "The Adaptable Museum Companion"**

ArtAround should feel familiar and approachable to casual museum visitors as well as staff. Mantine is the main design system: recognizable controls, clear labels, system typography, neutral surfaces, and straightforward task flows provide the foundation. The existing UI is the main suggestion for the product's feel, but remains a prototype rather than a finished specification.

The system is best described as **one product over four namespaces**. They coexist in the same runtime and dress very different jobs:

1. **Visitor Mantine UI** — the visitor-facing interface. `src/theme.ts` is an empty `createTheme({})`, so the palette is Mantine's stock tokens plus Tailwind utilities; this layer is the brand authority for the visitor experience.
2. **shadcn / editor token layer** — Tailwind v4 `@theme inline` plus `:root` / `.dark` OKLCH variables (background, foreground, primary, border). Neutral by design; it is not Mantine's palette and should not be mistaken for it.
3. **Pascal editor and viewer** — the staff map editor and museum viewer, styled largely by `@pascal-app/*` module CSS and Tailwind `dark:` variants. Task-dense, dark-neutral, functionally layered.
4. **Assistance layer** — the voice assistant's look. Its shipped identity is the ember **assistant orb** (React Bits `CrystalizedBall`, `src/components/assistant/`), which sits in the tour-navigation bar. The older LiveKit `agents-ui` shader visualizers (cyan aura) remain in the code, but no screen renders them any more: only their session provider is still mounted in the frontend layout. Either way this namespace has exactly one sanctioned expression per screen (see Components → Assistant orb), not a global motif.

Playfulness belongs in small key components. Existing examples include the purple-to-orange tour carousel, the animated search border and its reflection, the cycled hero word, and selected discovery accents. These establish permission for selective expression; they do not require every page or control to animate or become decorative. Future refinement can improve consistency, spacing, accessibility, and responsive behavior while keeping this approachable character.

**Key Characteristics:**

- Familiar and approachable Mantine controls as the visitor-facing foundation.
- Neutral light and dark surfaces with clear task hierarchy.
- Four coexisting style namespaces that must not be blended.
- Small playful exceptions in museum discovery, scoped and few.
- Functional depth for overlays and floating controls.
- Generated help that wears the museum's own voice: buttons and forms, never a chat.
- Prototype-informed direction with room for refinement.

**The Two-Namespace Rule.** Mantine color tokens and the editor's OKLCH tokens are distinct sources of truth in the incumbent code. Treat them as separate namespaces rather than one blended palette; do not "harmonize" one into the other as a side effect of a local change.

**The Scoped Playfulness Rule.** Decorative motion and gradient belong to named discovery components. If a playful treatment is being added to an ordinary form, list, or navigation element, it is out of scope by default.

## Colors

The palette is Mantine's stock control palette plus Tailwind gradient stops, with a separate neutral OKLCH layer for the editor. It is deliberately plain at rest: color carries identity on discovery cards, badges, and a few controls rather than across whole surfaces.

### Primary

- **Navigation blue** (`navigation-blue`, `DEFAULT_PRIMARY` shade 6 in `src/theme.ts`): the common-action color and the moving active-tab underline (`border-b-(--mantine-primary-color-filled)` on the `FloatingIndicator`). Its hover step is blue.7. Links use the darker blue.8 step with a hover underline. In code it is the theme color `museum` (`src/theme.ts`, the primary color): by default `DEFAULT_PRIMARY`, Mantine's blue (`#228be6`) run through the same `museumPalette` as a museum's color, so shade 6 is `#0077d1` at 4.6:1 on white (stock blue.6 was 3.6:1, below AA); the scale is frozen in code and a test checks it still matches `museumPalette('#228be6')`; the locked museum's palette in museum mode (The Museum Primary Rule). Write `museum`/`museum.8` or no color for this role; `blue` stays only where blue has its own meaning.
- **Navigation blue hover** (`navigation-blue-hover`, `DEFAULT_PRIMARY` shade 7): the pressed/hover partner of the above. It is not the only navigation color — the bottom navigator entry is green and marketplace entry is red.

### Secondary

- **Tour purple / tour orange** (`tour-purple`, `tour-orange`): the tour identity. The card's diagonal gradient is Tailwind `from-purple-700 to-orange-400`, echoed literally in an SVG gradient (`#7e22ce` → `#fb923c`) and in gradient-clipped heading text. Mantine `variant="gradient"` marks (Start tour, tour pills, the Plan my visit start) use `TOUR_GRADIENT`, `grape.8 → orange.9` (`tour-grape` → `tour-orange-deep`): the deeper steps, so white text on either end of the gradient keeps AA; related treatment, not an identical token.
- **Grape** (`grape`, Mantine grape.6): the tour de-emphasis/control accent. Tour card borders and the carousel's previous/next controls currently use `border-mantine-grape-6`. It also marks the staff side of the bottom navigation: the "My museums" entry is grape, which keeps it apart from the visitor-facing green Navigator and red Marketplace.
- **Paid orange** (`paid-orange`, Mantine orange.6): the color of acquisition and of locked content. It appears on the "Unlock for €…" button, the tour's "Edit/Customize tour" action, the `Lock` price badge on locked tour contents, and the orange `Alert` that replaces the body of a paid content the viewer isn't entitled to. It always comes with a `Lock`, `ShoppingBag` or `Pencil` icon and a label.
- **Content teal** (`content-teal`, Mantine teal.6): the content identity. Content outlines use Tailwind `border-teal-600` (`border-2`), and content headings use a Mantine `teal → cyan` gradient. Preserve the distinction when tracing styles; do not silently substitute one value for another.
- **Assistant ember** (`assistant-ember`): the orb's particle color, from the user-supplied ember reference. It lives inside the orb's WebGL canvas and nowhere else: no button, badge or border takes it. By hue it is close to paid orange, and the two never get confused, because the orb carries no text while an acquisition control always carries a `Lock`/`ShoppingBag` icon and a price.
- **Voice aura** (`voice-aura`): the default accent of the legacy `agents-ui` shader visualizer (`#1FD5F9`), which no screen renders any more. It is evidence of that older layer, not a palette commitment. New assistance UI uses the ember orb.

### Tertiary: museum markers

A small semantic set that comes from one source: `SERVICE_META` / `EXIT_ENTRANCE_META` in `src/lib/pascal/museum-plugin/markers.ts`. Each marker kind carries an icon, a Mantine color name for badges, avatars and action icons, and a matching hex for three.js materials. The visitor's service buttons, the museum page's service avatars, the staff services toolbar and panel, and the 3D map pins all read this table, so a service looks the same in 2D and in 3D.

- **Toilets / entrance:** blue (Mantine blue.6, `Toilet`, `LogIn`). Fixed: markers never follow the museum color (The Single Marker Table Rule).
- **Food:** easy green (`Utensils`).
- **Info point:** paid orange (`Info`). It shares the hue with acquisition, and only the icon tells them apart, which is why the icon is mandatory.
- **Shop:** marker red (`marker-red`, red.6, `ShoppingBag`).
- **Exit:** exit red (`exit-red`, red.4, `LogOut`). It is a lighter red than the shop, so the two stay distinguishable on the map.

**The Single Marker Table Rule.** Never pick a marker color locally. Add or change a marker kind in `markers.ts` so that the 2D chrome and the 3D material stay in sync.

### Feedback and data

- **Answer right / answer wrong** (`feedback-correct`, Mantine green.8; `feedback-wrong`, Mantine red.8): the quiz's verdict text and the `light` tint of a graded answer option. Always paired with a ✓ / ✗ icon and a word ("Right answer", "Your answer"), per The Triplet Rule. These are darker steps than the difficulty green/red so small labels keep contrast on their light tints.
- **Your bar / everyone else** (`chart-highlight`, Mantine orange.5; `chart-muted`, Mantine gray.4): the score-distribution chart on quiz results. Orange is the warm half of the tour identity, so "you" reads as part of the tour; every other band stays quiet gray. Per-question rates use a neutral `gray.6` `Progress`, not a hue.

- **Light surface / subtle surface** (`surface-light`, `surface-subtle`): white and Mantine gray.0. Objects use relatively plain image-led presentation so the museum image or object can lead. The tour-navigation bars, the GPS pad and the settings popover are plain white Mantine surfaces too, so the map stays the loudest thing on screen.
- **Dark surface / dark control / dark border / dark-scheme text**: the rendered Mantine dark theme uses the corresponding frontmatter values. Prefer Mantine's semantic variables over hardcoded light surfaces so scheme switching keeps working.
- **Editor neutral tokens** (`editor-background`, `editor-foreground`, `editor-primary`, `editor-border`): the OKLCH values recorded above drive the global `--background`, `--foreground`, `--primary`, and `--border` in light mode; `.dark` supplies their alternates. Editor primary is neutral and is not Mantine navigation blue.
- **Dimmed text**: supporting copy uses Mantine's `dimmed` token (e.g. catalog hints, input descriptions). In light it is gray.7, not Mantine's gray.6 (3.3:1 on white, below AA): `cssVariablesResolver` in `src/theme.ts`, passed to the app's and Storybook's MantineProvider; the navigator's "Or" divider label uses gray.7.
- **Placeholder text**: input hints that carry real information (the search's examples, the group code example), so `cssVariablesResolver` raises Mantine's placeholder (gray.5, 2.1:1 on a white field; dark.3, about 2.5:1 on a dark one) to a mix of gray.6/gray.7 in light and dark.2/dark.1 in dark, about 4.7:1 in both. It stays lighter than typed text.
- **Light-variant text** (`lightVariantText`, `src/theme.ts`): the text of every `variant="light"` control and badge (`--mantine-color-<color>-light-color`) is the first of shades 6–9 that reaches 4.5:1 on that palette's shade 1, else shade 9 darkened until it does. The `cssVariablesResolver` sets it for every palette, museum palettes included, so a light yellow or teal badge stays readable.

### Named Rules

**The Follow-the-System Rule.** The app is light or dark as the visitor's system says (`defaultColorScheme="auto"` in `AppMantineProvider` and `MantineColorSchemeScript`, set before the first paint). Tailwind's `dark:` follows the same `data-mantine-color-scheme` attribute (the `.dark` class stays for the Pascal editor). Text colored with a fixed dark shade (`c="green.8"`, `museum.8`, primary .8) is written `light-dark(<color>.8, <color>.4)` so it keeps AA on the dark page; filled buttons with `autoContrast` need nothing. `light-dark()` works in Mantine props (inline styles) and in Tailwind classes alike: Lightning CSS lowers the Tailwind ones to `--lightningcss-light/dark` variables, which `globals.css` sets from Mantine's attribute. In dark the theme lifts `dimmed` and the placeholder to dark.2/dark.1 mixes (about 4.8:1 and 4.6:1 on a card). The 3D map scene keeps its own light stage.

**The Highlight-One Rule.** A chart colors exactly one series or bar: the visitor's own. Everything else is `chart-muted`. If nothing belongs to the viewer, the chart is single-hue.

**The Museum Primary Rule.** In museum mode (the museum switch, or a printed QR with `?museum=`) the navigation blue becomes the museum's color, and only it: buttons, links, active tab, selection, focus ring, the museum switch. Tour gradient, content teal, paid orange, difficulty, quiz feedback, markers, the destructive red and the accessibility blue (`accessibility-blue`, `ACCESSIBILITY_COLOR` in `src/theme.ts`: the museum's accessibility badge and feature checks, the tour's step-free badge, the map's wheelchair-route toggle) never change. The director picks one `brandColor`; `src/lib/museum-palette.ts` derives the 10 shades with Leonardo: a brand color with ≥ 4.5:1 on white is used as is for shade 6, a lighter one is darkened within its family until it reaches it; shade 9 stays ≥ 4.5:1 on shades 1–2. Saturated red and orange are refused (they already mean "delete" and "paid"); tour grape, content teal and Navigator green only warn. The scale is computed once per save and rendered on the server (`museumTheme` → `MantineProvider`), so there is no flash of blue. QR codes stay black on white.

**The Triplet Rule.** Difficulty and status are never carried by color alone. The incumbent renders label + icon + color together (`Leaf`/green, `Gauge`/yellow, `Flame`/red.9). Keep all three when restyling.

## Typography

**Headline and body font:** Mantine's system sans-serif stack, recorded in frontmatter. No distinct branded display font is established. The separate Tailwind heading alias resolves to the same `--font-sans`, so it does not establish another typeface.

**Character:** familiar, readable, and practical. Typography should support museum content and quick decisions without requiring visitors to learn an editorial hierarchy unique to the app.

### Hierarchy

- **Headline:** Mantine h1, 2.125rem, weight 700, line-height 1.3, on every page's subject.
- **Display headline:** the navigator home's h1 only: fluid `clamp(2.25rem, 1.5rem + 3.2vw, 3.75rem)`, weight 800, line-height 1.08, tracking -0.02em. It names the visitor's task ("Find your way around art") over a dimmed one-line promise (who makes the tours, in your language and at your pace), hidden on screens under 700px tall so the start cards keep their height. The home's bold move is this scale, not effects.
- **Section heading:** Mantine h2, 1.625rem.
- **Title:** Mantine h3, 1.375rem; observed in object details.
- **Compact heading:** Mantine h5, 1rem; used in the tour-navigation header.
- **Body:** 1rem with default line-height 1.55; supporting text commonly uses 0.875rem, and compact footer labels 0.75rem.
- **Label:** 0.875rem. Badge casing follows the component treatment rather than becoming a global uppercase rule.
- **Badge floor:** `xs` and `sm` badges render at 11px (`--badge-fz-xs/sm: 0.6875rem`, `globals.css`, in `@layer components` so a component's own size still wins); Mantine's 9–10px uppercase badge text was below a readable size on a phone held at arm's length.

These are inherited Mantine values, not a new custom scale. The prototype does not establish a universal reading-column width. Text blocks lean on Mantine's `textWrap="balance"` and `lineClamp` rather than a fixed measure, with two exceptions that matter from `md`, where a column can otherwise run the full width: a content's body keeps a `68ch` measure, and the museum's Info tab stops at `75ch`.

- **Counters and scores:** progress counters ("Question 3 of 5"), the result score and numbered review items use tabular numerals (`font-variant-numeric: tabular-nums`) so digits do not jitter as they change. The result score is the one oversized number (36px, weight 800, with a dimmed 20px "/total").

**The One-Outline Rule.** Every page has exactly one `h1` (the page's subject: the tour, the work, the museum, the person, the search kind), and its sections are `h2` (visually `h4`-sized where they are compact: `EditableSection` titles, carousel sections, "Tours that stop here"); cards inside a section are `h3`. A dialog's title is its own `h2` (`headingOrder` on `ObjectDetailsModal` and `ContentDetailsModalContent`: `1` when the same body is a page, `2` in a modal). Visual size is set with `size`, never by picking a lower level.

### Named Rules

**The tour gradient** is one token, `TOUR_GRADIENT` in `src/theme.ts` (`grape.8` → `orange.9`), passed to every Mantine `variant="gradient"` tour mark; don't re-declare the pair inline.

**The Gradient-Span Rule.** A gradient is applied to a fragment of text (a single word or short label) with `inherit` sizing, never to a paragraph. The navigator hero colors exactly one short phrase this way ("around art", which echoes the app's name). Its stops are theme tokens per scheme, `light-dark(blue.7, blue.4)` → `light-dark(violet.7, violet.4)`, each above the 3:1 large text needs.

## Layout

Stack and Group compose most visitor interfaces. Below `md` the app shell reserves a 64px footer and an auto-height header, and the tabbed area's footer holds a bottom navigation group with icon-plus-label entries; the language switcher and museum switch sit in a right-aligned row above the page. From `md` (62em) both give way to the sticky site header (see Desktop, below). Pages inside `AppShellMain` get the footer's room from the shell; the tab pages don't render there, so the tabs layout reserves it itself (the footer offset plus the safe-area inset and an `md` gap) and their last row is never under the bar.

Use the Mantine spacing vocabulary in frontmatter. Compact editor CSS also uses 0.375rem, 0.5rem, and 0.75rem gaps or padding; these are local layout measurements rather than additions to Mantine's named scale.

Content and object carousels show 60% slide width at base, 33.3333% at `sm`, and 25% at `md`, with `sm` slide gaps. The inherited breakpoints are `xs: 36em`, `sm: 48em`, `md: 62em`, `lg: 75em`, and `xl: 88em`.

Layouts are fluid, never tuned to one screen: no offsets measured on a phone (`100dvh - 565px`); flex and grid share the space, with fluid units, container queries and `clamp()` between design limits. Responsive styles are Tailwind utilities on Mantine's breakpoints and tokens, through the variants in `globals.css`: `from-sm` (48em), `from-md` and `below-md` (62em), and `fit-screen` (below `md`, portrait, at least `xs` tall). Tailwind's own `sm`/`md` (40rem/48rem) stay as they are because the Pascal editor uses them; app code doesn't. Mantine stays the API for components, static props and `hiddenFrom`/`visibleFrom`; a Mantine responsive prop is kept only where the Tailwind equivalent would fight the design system (`Text`'s `fz`, paired with Mantine's line height) or turn convoluted (a long arbitrary `calc()`).

**Navigator home on phones** fits one screen, between the top controls row and the tab bar, whenever it is held upright and at least `xs` tall (`fit-screen`): the tabs layout is a column at least `100dvh` tall, the home takes exactly the height left (size containment), the space above the title takes free height up to 10dvh, and the QR/plan row starts at its natural size and only shrinks when the screen is short, its visuals giving way first while the captions keep their lines. Each card is a width container; its body is a grid whose visual row is at most a square as wide as the card (capped at 12.5rem), and `StartVisual` draws the largest square that fits that row (`100cqmin`). Landscape and shorter screens keep the normal flow and scroll.

**Tour navigation** is a full-viewport composition under the shared shell: an `rounded-b-xl` header stacks the title row (title, position line and the leave link, see Components → Navigation → Tour header), a linear `Progress` bar, and a horizontally scrolling `Stepper` of tour stops; the main area is `100dvh` with `overflow-hidden` and holds the map; a `rounded-t-md` footer is the **navigation bar**: the directions strip grows from a 16rem basis and the assistant keeps its intrinsic target size. The footer wraps and grows with text. Route states (finding a route, no route, tour complete, no position yet) are states of that strip, not separate footer messages. "Open next stop" and "Resume tour route" live in a centered button pair that floats just above the map's control row. Controls that must float above the canvas live inside an `Overlay backgroundOpacity={0}` with `pointerEvents: 'none'`, and each interactive child opts back in with `pointerEvents: 'auto'` — a pattern worth preserving, since it keeps the map draggable underneath.

Inside that overlay, measured header and footer heights bound the available control space. A shrinking, vertically scrollable column holds the GPS simulator, nearby-work notices and next-stop/resume actions; a separate dock keeps Services, Scan, Search and Settings available beneath it. The dock wraps when space is narrow. Services and the wheelchair route toggle live in a labelled, scrollable Mantine popover, with selection state exposed on each action. Contextual desktop panels clear both measured bars, including a footer enlarged by text.

**The Navigation Reach Rule.** Navigation action targets are at least 44px; compact labels may keep their type scale while the hit area grows. Button labels wrap and their height grows with enlarged text. Bound secondary controls between the measured bars and let their column scroll; keep the essential command dock outside that scrolling column.

The museum map supports floating task controls. The staff creation toolbar is positioned at top 4.5rem and left 0.75rem, and the museum services toolbar mirrors it at top 4.5rem and right 0.75rem. Both are vertical, have bounded height (`calc(100% - 10rem)` on the services side) and scroll vertically. The object catalog and services panel keep a scrollable body (services rows cap at 60vh) and wrap their actions.

Below `md`, every tab page (navigator, marketplace) opens with one right-aligned row above its content holding the **museum switch** (see Components → Museum switch). From `md` that row is hidden and the switch sits at the trailing edge of the site header, on every browsing page rather than only the tabs. In museum mode the whole app is scoped to that museum, so the switch is the visible reminder of the lock.

**Plan my visit** (`/[lng]/tour/plan`) is a single centered column (`Container size="xs"`, `py="xl"`, `Stack gap="lg"`): below `md` `BackToNavigator` (`src/components/navigation/`: a subtle "Back to the navigator" link, since the page has neither the site header nor the bottom navigation there), an `h1` with a dimmed one-line intro (naming the museum in museum mode), then the fields, then one full-width primary button with a status line under it while planning ("Choosing the stops at {museum}…", a `role="status"` region; the fields sit in a disabled `fieldset` meanwhile). Fields are `size="md"` (16px text, so phones don't zoom on focus) and carry their examples in `description`, never in a placeholder. In view: museum (name and city), time, interests (with Dictation), the step-free route checkbox with a description of what it changes. First/returning visit and the group sit behind a bordered "More about your visit" disclosure whose second line summarizes their values ("First visit · Adults: 1 · Children: 2"), so nothing is set out of sight. The group is two numeric `NumberInput`s (adults, children) without steppers; each child then gets an age field (0–17), and a missing age is an inline error on submit, never a silent drop. Errors are a red `Alert` with a `CircleAlert` icon, one message per cause (no connection, too many requests, unreadable answers, museum missing, no free contents). The preview replaces the form in the same column rather than opening a modal and is a URL state (`?tour={id}`, pushed onto the history, so Back is "Change" and a reload restores it from sessionStorage through `createSessionStore`, `src/lib/session-store.ts`, the same store as the quiz progress; opened without that tab's data, the link goes to the tour's own page). Focus moves to its `h1`. It shows the at-a-glance badges of the tour page, including step-free (`ACCESSIBILITY_COLOR`) and "Children's versions" when the answers asked for them, the stops as a list, and ends with a `Group grow` pair: `default` "Change" and "Start the visit" in the tour gradient (`TOUR_GRADIENT`, `Play` icon). On the navigator home its entry is the right half of the "Or" row, the twin of the QR scan card on the left: the same `Paper withBorder shadow="sm" p="xs"` link card (full row height; on phones it fills its half of the row, from `md` `w-min` so the visual sets its width), holding a round filled `ThemeIcon` with a `Route` icon the same size as the QR (`--start-visual`: 12.5rem from `md`; on phones as large as the card and the screen allow, see Navigator home on phones) over a caption in the body text color.

Detail pages for museums, objects, contents and tours stack read-only sections. When the viewer may edit, owner actions appear inline as a compact row of `size="xs"` `light` link buttons (map, tour, new content), with `subtle` used for lower-priority staff management. Editing never moves to a separate admin chrome; it happens where the content is read. These measurements describe current layouts; they should be refined when content, touch use, or viewport constraints expose defects.

**Tour page** (`/[lng]/tour/[id]`) is a `Container size="sm"` column in `AppShellMain`: the `lg`-radius cover (`DetailCover`, see below; without a tour picture, the first stop's picture stands in before the gradient fallback), the `h1`-sized title with the QR (and owner delete) icons at its trailing edge, a blue.8 `Landmark` link to the museum and a dimmed "By {author}", the dimmed description, then **at-a-glance badges** (`lg`, `light`, each icon + words: blue `Clock` "About 35 min", gray `MapPin` "N stops", gray `Footprints` distance, blue `Accessibility` "Step-free route", grape `ListChecks` "Ends with a quiz", yellow `Star` rating with its count). "The stops" (`h4`-sized) carries the total reading time on its trailing edge and the reading profile beneath it: one `light` difficulty badge per level present, "2 · Easy". The stops are a `Timeline` with numbered 28px bullets; each stop is one link row (56px `md`-radius picture: the content's image, else its object's thumbnail, else a light teal `BookOpen` tile) with the title over `xs` difficulty, duration and locked-price badges. A tour with a quiz ends on a `ListChecks` item. Unit figures go through `Intl.NumberFormat` (`unit: minute | meter`), and every figure comes from `summarizeTour` (`src/lib/tour-summary.ts`): a figure the data can't support is left out, never estimated. The action pair sits right after the at-a-glance badges, before "Before you go" and the stops, so the way in never hides under the logistics; below `md` it is the footer's evenly split pair: paid-orange acquisition ("Unlock for €…", filled) or a `light` orange "Edit/Customize tour", and the gradient "Start tour".

**Detail covers** (`DetailCover`, `src/components/mantine/DetailCover.tsx`) open the object, content, tour and museum pages (and the object modals): the picture full column width at `clamp(160px, 32dvh, 360px)`, `lg` radius, `cover` fit. Capped so that on a phone the title, the at-a-glance facts and the start of the text still land above the fold. Without a picture the kind's identity stands in, decorative: `KIND_FALLBACK` (`src/components/mantine/kind-fallback.ts`, shared with marketplace cards and the tour start page), the tour gradient with a `Map` mark, or teal into cyan with a `BookOpen` mark for a content (its own first image, else its object's thumbnail, comes first). The cover is also the way into the pictures and the model, see Media card under Components. The **content page** follows the tour page's Thumb-Reach footer: "Find it on the map" (blue.8, full width) or, while locked, the paid-orange unlock, so its main action never sits below a long text; the section's Edit opens one inline form for metadata and the rich-text body (TipTap, loaded on demand), with Delete after it in the section header.

**Detail pages cap their width.** From `md` the museum, object, content, tour and profile pages share a 1140px content width (a Mantine `Container` widened with `maw={{ md: 1140 }}`, or a centered `Stack` of `maw` 1204 with `xl` side padding) and split into two panes (see Desktop).

**Focused task pages** (the end-of-tour quiz and its results) leave the map layout entirely: a single `Container size="xs"` reading column (540px, `md` side padding) inside `AppShellMain`, so the shell reserves room for the fixed 64px `AppShellFooter`. The footer carries exactly one full-width forward action ("Next question", "See your results", "Back to the navigator"); secondary actions stay in the column. The quiz, its results and the host's group quiz board keep that footer at every width: they are step flows, and the forward action stays in the same place from question to question. The quiz adds a sticky in-column header (back icon, tour title, "Question n of N", progress bar) on the body background; it sticks at `var(--site-header-height, 0px)`, so from `md` it sits under the site header. Sections on the results page are separated by `xl` stack gaps and titled with compact `h4`-sized headings; review items are a divided list, not cards.

**Auth screens** (`/[lng]/login`, `/[lng]/signup`) reuse the Plan my visit column exactly (`Container size="xs"`, `py="xl"`, `Stack gap="lg"`): an `h1` with a dimmed one-line intro, the fields, one full-width primary action. They sit outside the tabs group, so there is no bottom navigation (below `md` `BackToNavigator` opens the column, as on Plan my visit), and no card or shadow around the form (The Functional-First Rule). Signed-in visitors never see them; they are redirected to their profile.

**Checkout landing pages** (`/[lng]/checkout/success`, `/cancel`) are focused task pages (below): the outcome as an `h1` with a dimmed explanation in the `xs` column, and the way back ("Back to the tour" / "Back to the navigator", or "Sign in" when signed out) full-width in the footer below `md`. From `md` the footer is hidden and the same full-width `md` action sits right under the message (`xl` above it).

The bottom navigation exists only below `md`. At 390px it holds up to four entries (Navigator, Marketplace, account, My museums). Each button uses `px={4}` and the group a 4px gap, so "Marketplace" and "My museums" fit whole; only a long account name truncates. The language switcher moved to the top row (a compact `xs` filled pill `Select` with a `Languages` icon and an `aria-label`, beside the museum switch; each option leads with its code as a light gray `sm` `Badge`, "EN", "FR", before the native name) because it squeezed the tab labels. Any new tab entry must still fit at 390px.

**Page titles and landmarks.** Every page names itself in the browser tab through `generateMetadata` (`%s · Artaround`, the template in the frontend layout; `APP_NAME` in `src/lib/app-name.ts`), from the same cached read the page uses (React `cache`), never a second query. The layout keeps `#main-content` a `div` (the skip link's target); each page renders its own main landmark, `AppShellMain` or its root `Container component="main"`, because `AppShellMain` is always a `<main>` and two would nest.

### Desktop (from `md`, 62em)

Desktop is an adaptation of the same world, not a second skin: no new color, type, radius or motion. Every desktop rule is gated at Mantine `md` through `visibleFrom`/`hiddenFrom`, the Tailwind `from-md:` variant (or the older inline `min-[62em]:`), `useMatches`, or a `min-width: 62em` query (`$mantine-breakpoint-md` in CSS), so the phone layout below it is untouched.

- **Site header** (`SiteHeader`, `src/components/navigation/`): one sticky 56px bar on every browsing page (tabs, museum, object, content, tour, search, profile, plan, auth, quiz, checkout, room). It renders nothing on immersive surfaces that own the viewport: tour and free map navigation (`/museum/[id]/navigation…`, except a tour's start page, which has no map), the QR scanner, and the map editor. While it is on the page, `globals.css` publishes `--site-header-height: 56px` through `:root:has(#site-header)` (0px otherwise). Two derived tokens sit beside it: `--site-pane-top` (header plus `md`, where a sticky pane sticks) and `--site-pane-height` (the viewport left under it, with an `md` margin below); sticky panes use those, in-page sticky headers `var(--site-header-height, 0px)`. Its contents are in Components → Navigation.
- **Navigator home:** the page is a centered column of at most 1120px with `xl` padding, the hero and search inside a 720px measure. The three ways in (scan a QR, plan a visit, join a group) become one row of equal columns divided by vertical `Divider`s under the "Or" rule, QR and plan stay the twin bordered cards they are on phones (the caption under plan drops its leading "Or", which would repeat the divider), and the group code gets a round `light` `ThemeIcon` with `UsersRound` (decorative, the cards' visual size) above its `PinInput` form, unframed because it is a form, not a link.
- **Two-pane detail pages** (Mantine `Grid`, gap 48px or `xl`, stacking to full-width columns below `md`):
  - **Museum:** the `DetailCover` 5/12 beside identity and actions 7/12 (title, city, badges, "Explore the map", owner shortcuts, short description), so the tabs reach the first viewport. Below, the contents tab puts the tour deck (5/12) beside the objects row (7/12); the Info tab stops at `75ch`.
  - **Object:** the `DetailCover` (photo, lightbox, 3D toggle) alone in a sticky 5/12 pane (`top` `--site-pane-top`), its `height` `min(var(--site-pane-height), 640px)`, beside the details 7/12; the inline cover is hidden from `md` (`coverHiddenFrom`).
  - **Content:** stays one `Container size="md"` reading column (cover, text, then `ContentDetails`, which already carries the object, museum, author and badges). Only the way forward moves: unlock or "Find it on the map" sits under the text at most 22rem wide, and the footer is hidden.
  - **Tour:** a sticky 5/12 summary pane (`--site-pane-top`, at most `--site-pane-height` tall; `DetailCover`, title, author, description, at-a-glance badges, and the action pair inline; it scrolls on its own when taller than the viewport) beside "The stops" timeline 7/12.
  - **Profile:** the profile column 4/12 (identity with "Sign out" at its top-right, badges, bio; not sticky, so a long bio never outgrows the viewport) beside the tabs 8/12.
  - **Tour start:** the composition fills the viewport under the header and centers title, cover, actions and join form as one block (`gap` 40px).
- **Search pages** (tours, objects, contents) sit in `Container size="lg"` with the incumbent side padding below `md`.
- **QR scanner:** the full-screen scanner is framed from `md` as a centered 4:3 window (at most 960px wide and the viewport's height, `lg` radius, `shadow-sm`, `xl` margin); `contain: layout paint` makes the frame the containing block of the scanner's fixed layers.
- **Map navigation** (`navigation-desktop.module.css`, shared by tour and free navigation): the map stays the loudest thing. The header column is capped at 75rem and centered, and a stepper that fits is centered (a longer one still scrolls). The wrapping command dock and the scrollable secondary-control column align at the bottom-left from `md`, with Services, Scan, Search and Settings beneath the next-stop pair; the right side is where panels dock. The directions strip takes `flex: 0 1 40rem` for a bounded reading width; active guidance includes the orb in its responsive control row. Contextual content, object and step modals dock as a right-side panel (see Components → Navigation).

### Named Rules

**The Below-md-Unchanged Rule.** A desktop adaptation is additive from `md` (62em). Gate it with `from-md:`, `hiddenFrom`/`visibleFrom` or an `md` media query; never change the phone layout for a desktop reason.

**The No-Tuning Rule.** A layout must hold at every size. Never calibrate a value to one device; when a page has to fit a screen, let flexbox share the height and let one element (a visual, not text) give way.

**The Thumb-Reach Rule.** Below `md`, on a focused task page, the next step lives full-width in the footer, inside reach of a standing visitor's thumb, and nowhere else. Content scrolls; the forward action does not. Build it with `ActionFooter` (`src/components/mantine/ActionFooter.tsx`): the 64px `AppShellFooter` with a `Container` matching the page column (`xs` for task pages, `sm` for the tour and content pages). From `md` there is no thumb to reach for: detail and outcome pages (tour, content, checkout) pass `inlineFrom="md"`: the footer steps aside and `ActionFooter` renders the same action inline where it is placed, right under what it acts on (`inlineProps` sizes and spaces it), so the action is written once. Step flows (the quiz, its results, the group quiz board) keep the footer at every width.

**The Overlay Opt-In Rule.** Floating controls over a map or canvas sit in a transparent, non-interactive overlay container; each control re-enables pointer events on itself. Never give the container pointer events back.

## Elevation & Depth

Depth is functional: restrained shadows distinguish floating controls and overlays from their background. Mantine's shadow vocabulary does the work, and the tour card is the one place where depth is allowed to be decorative.

- **Toolbar** (`var(--mantine-shadow-xs)` plus a 1px `--mantine-color-default-border`): separates the editor creation and services toolbars from the canvas.
- **Menu** (`shadow="md"`): the bottom navigation's "My museums" dropdown, which opens upward with an arrow, and the guidance-settings `Popover` (`top-end`, with an arrow), which opens above its icon.
- **Small surface** (`var(--mantine-shadow-sm)`): the inherited step used by plain `Card shadow="sm"` surfaces such as search results and the QR paper, by the GPS simulator pad over the map, and by the scanner's desktop camera frame.
- **Hover lift** (`shadow-md` on hover): a card that is one whole link rises one step on hover: the navigator's QR and plan cards and a linked search-result card, which also lift while their link has `:focus-visible`; the navigator cards carry `mantine-focus-auto` for Mantine's focus ring.
- **Site header:** flat. The body color with a 1px `--mantine-color-default-border` hairline below and no shadow; `z-index: 150` keeps it above page content and carousels and below Mantine's overlays (modals, menus, notifications).
- **Notifications:** Mantine notifications at `top-center` carry everything transient during navigation: nearby suggestions, the assistant's reply as a caption, and assistant errors. Top-center keeps them clear of both the bottom controls and the navigation bar.
- **Tour card** (`var(--mantine-shadow-lg)`): supports the layered tour treatment.

The animated search is a deliberate exception rather than an elevation step: a `BorderAnimate` wrapper runs a four-second border cycle around the combobox (it wraps the whole `Combobox`, so the input itself stays the combobox target). Treat it as part of the discovery accent, not as a reusable depth token. The navigator's former `Reflection` wrapper was removed: it cloned the search into an invisible input that still took keyboard focus.

### Named Rules

**The Functional-First Rule.** Shadows appear because something floats or overlays. Marketing-style ambient shadow on ordinary content is not part of the incumbent vocabulary.

## Shapes

Mantine provides the main radius scale: `xs` through `xl` in frontmatter, with `sm` as its ordinary default. Rounded images and cards coexist with pill-like search and badge controls: the global search is `radius="xl"` (32px), the tour tag badge and difficulty chips are fully round, and the newest circular controls (`Scan` pill, service icons, the microphone button, the assistant orb) use `rounded-full`, and the spotlight's command pills, the modals' reading and "Tell me more" pills, the museum switch, and the settings and wheelchair icons use `radius="xl"`.

The editor's `--radius` is separately 0.625rem, with derived multipliers in the global stylesheet. Do not mistake this for a replacement of Mantine's radius scale. Border-based grouping and image cropping remain useful even where shadows are present: content cards use a 2px teal outline, and content/object modals crop images to a `radius="md"` frame. Border style can carry state: a service card that still needs a map position has a dashed yellow.6 border, and it always comes with a "Not placed" badge.

### Named Rules

**The Inherit-Radius Rule.** Nested surfaces take their radius from the parent (`rounded-[inherit]`) rather than inventing a new value; this is what keeps the `BorderAnimate` wrapper flush with the input it decorates.

## Components

### Nearby-work notice

**The Arrival and Discovery Rule.** Proximity suggestions stay inside the map's
controls as a compact, scrollable, nonmodal surface. A next destination uses a
flag, an explicit next-stop label and a filled primary action; an optional
discovery uses a compass, a discovery label and a neutral action. Meaning must
not depend on color alone. The filled action uses the deeper museum-primary
shade with automatic text contrast. Recognition choices pair small images with
names, with text/actions preserved when the image is missing. Opening an object
and confirming “I am here” remain separate actions. No new design tokens were
needed; the notice composes the existing Paper, Button and ActionIcon vocabulary.

Each component below leads with its character, then shape, color assignment, states, and any distinctive behavior. Everything here is observed prototype behavior.

### Buttons

- **Shape:** Mantine `sm` radius except deliberate full-round pills.
- **Primary:** filled navigation blue; the `Scan` action is a `size="compact-xl"` dark full-round pill with a trailing icon, so it reads as a tool rather than a form action.
- **Hover / Focus:** inherited Mantine states; the start-tour action additionally scales on hover.
- **Supporting:** `variant="default"` for a calm second action ("Resume tour route", Cancel in form rows), `variant="light"` for service icons and owner shortcuts, `variant="white"` for floating icons over the map, `subtle` for an inactive bottom-nav entry.
- **Into the map:** moving inside a museum is navigation blue (`blue.8`, leading `Compass`): "Explore the map" under a museum's title, "Find it on the map" under a content the visitor can read. A locked content offers acquisition instead (below). Starting a tour wears the tour gradient (`variant="gradient"`, `grape → orange`), as on the tour page's "Start tour". Both appear only when the museum has a saved map.
- **Acquisition:** paid orange, filled, `autoContrast`, with a trailing `ShoppingBag` ("Unlock for €…"). On a tour page it sits beside the blue.8 navigate button. Navigation is always offered; locked contents just stay locked along the way. The orange marks the _entry_ to buying; inside the unlock modal the committing "Buy all for €…" is the ordinary filled primary (blue, leading `ShoppingBag`, `loading` while Stripe Checkout is created), above a `default` "Replace the paid contents". Signed-out visitors get "Sign in to buy" (`LogIn`) in its place. A locked content (its page and the map's content modals) shows the paid-orange "Unlock for €…" (`ContentUnlock`), or an orange "Sign in to buy" link, where a readable content shows "Find it on the map"; checkout returns to the content.
- **Destructive:** `subtle` red with a leading `Trash2`, behind a centered Mantine confirm modal whose confirm button is red. Row-level removal uses a red `subtle` `ActionIcon`.
- **Form rows (`FormActions`):** right-aligned `xs` group with a `default` Cancel followed by a filled Save that shows `loading` while saving. Feedback goes through Mantine notifications: green "Saved", or red with the server's message.
- **Server-rendered links:** `LinkButton` puts a Mantine Button on a Next `Link`, so server pages can render actions without passing functions across the client boundary.
- **Icon-only:** canvas and floating actions must carry both a tooltip (`title`) and an accessible label (`aria-label`). Toggle-style icons expose `aria-pressed`.

### Chips / Badges

- **Difficulty:** label + icon + semantic color (see The Triplet Rule). Compact contexts may hide the label (`withLabel={false}`) while keeping the icon, or keep the label with a compact duration chip beside it in a stepper description.
- **Duration:** a clock icon with a label in the visitor's language and short unit words (`15 sec`, `1 min 30 sec`, `12 min`; Italian `15 s`, `1 min 30 s`; `formatDuration` in `src/lib/duration.ts`). Timetable primes (`1'30"`) were dropped: first-time visitors read them as cryptic. Unlike the other chips the label is not upper-cased, since unit symbols change meaning with case. Contents carry their exact length in seconds; tours their visit length in minutes.
- **Private:** a gray `light` badge with `EyeOff` and "Private" among a private content's or tour's at-a-glance badges (only their author and group guests ever see them).
- **Category pills:** white surfaces with colored or gradient text — `Badge variant="white"` with a teal border on contents, `variant="gradient"` for section labels. Category appearance and difficulty meaning are separate concerns.
- **Locked price:** a `light` orange badge with a leading `Lock` and the formatted price, placed next to a locked content's title.
- **Status:** small `light` badges such as yellow `xs` "Not placed". Each one names its state in words.
- **Content at a glance** (`ContentGlance`, `ContentDetails.tsx`): a content's difficulty, duration, category (`variant="default"`, so it reads as a label, not a state), Private and locked-price badges as one wrapping row, shared by the content page under its `h1` and the content modals, so the two never list different facts.
- **Service avatars:** round Mantine `Avatar`s in the marker color with the marker icon. The museum page derives them from the services that are actually present in its map.
- **Accessible:** the blue filled `Accessibility` icon beside the service avatars appears only when the museum declares `accessibility.isAccessible`; the Info tab lists the confirmed facilities (step-free entrance, elevator, …) with light blue check icons. Unconfirmed facilities are not mentioned.

### Cards / Containers

- **Search-result card:** the recurring calm container — `Card shadow="sm" padding="sm" radius="md" withBorder` with a 160px cover image, a one-line title and a two-line dimmed description. It lives in `SearchResultCard` (`src/components/mantine/SearchResultCard.tsx`), and `SearchResultsGrid` owns the 1/2/3-column grid and the dimmed empty line. The tours, objects and contents result lists all render through it; `variant="content"` adds the teal content outline. With an optional `href` the card becomes one click target: the title is a stretched link over the card (one link, named by the title), any `children` actions sit above it on their own targets, and the shadow lifts on hover (see Elevation). Tour and content results link to their pages, except while picking a tour stop, where a stray click would break the round trip. Build new listings on it instead of re-declaring the card.
- **Placeholder image:** every missing thumbnail falls back to `PLACEHOLDER_IMAGE` (`src/lib/placeholder-image.ts`): an inline SVG, a soft gray gradient with a faint picture-frame mark (no "Placeholder" text, no network request). Don't inline another URL. The tour start page uses the tour gradient (grape → orange) with a `Map` mark instead.
- **Content cards:** teal `border-2` outlines with square-ish image areas and `rounded-xl` framing.
- **Tour cards:** purple/orange framing, grape borders, stacked selection, and explicit previous/next controls. Each card is non-interactive (it sits in a `role="option"`): the title and its figures ("N stops", minutes) sit in white over a bottom black scrim, the header shows "2 of 5", and the deck's footer button "Open this tour" links to the selected one.
- **Object cards:** square photos, each one whole link to the object, with the name in white (and "artist · dating" in gray.3) over a bottom scrim; the row's heading carries the object count in dimmed type. No "see more" affordance without a page behind it.
- **Object detail images:** the object's photo is its `DetailCover` (see Media card); a content's further pictures are a `PictureGrid`, two columns (three from `sm`) of 160px `md`-radius card-size images, each opening the lightbox at that picture.
- **Subject works:** a subject page's works are a picture grid (`SimpleGrid`, two columns, three from `sm`, four from `md`): each a 4:5 `AspectRatio` `md`-radius picture (`PLACEHOLDER_IMAGE` without one) over the name and a dimmed dating, one link per work.
- **Object facts:** the work's record (inventory number, provenance, credit line, rights) is a `<dl>` of label/value rows, dimmed `sm` labels beside the values, in `ObjectDetailsModal` on the object page and its modal; only the facts the work has are listed. "Contents about it" follows as links with their duration.
- **Museum info** (Info tab): opening hours as a two-column table (day, ranges) with a dimmed caption "Local time at the museum"; times are the museum's wall clock, stored as `HH:mm` text (`src/fields/OpeningHours.ts`) and only formatted in the visitor's notation (`openingHoursRows`, `src/lib/opening-hours.ts`: `Intl` in UTC on a fixed day, so no visitor or server zone shifts them). Then Tickets (the ticket note and a link), Phone (`tel:`), Email, "Follow the museum" social links, and the latest three News. Each block shows only when the museum entered it.
- **Staff and service rows:** `Paper`/`Card` with `withBorder`, `p="sm"` and `radius="md"`. The name sits in weight 500 above a dimmed `xs` secondary line (`@username`, status), and the actions are grouped at the trailing edge. Rows the viewer can't manage show their role as plain text instead of a disabled control.
- **Locked notice:** an orange `Alert` with a `Lock` icon takes the place of a paid content's body. It replaces the text instead of leaving an empty gap.
- Reuse these distinctions where helpful, without copying prototype inconsistencies as requirements.

### Inputs / Fields

- **Ordinary forms:** Mantine `TextInput` and `Textarea` with labels, descriptions, required indicators, errors, and disabled states as documented in Storybook.
- **Global search (the exception):** a large rounded input (`size="lg"`, `radius="xl"`) with a search icon, a 1px violet edge as theme tokens (`light-dark(violet.7, violet.4)`, about 5.5:1 on light and 4.6:1 on dark; it was CSS `purple`), set as the input's own `--input-bd` so there is one edge and focus still turns it to the primary color, and an animated `BorderAnimate` surround on a four-second cycle. Its incumbent hardcoded copy and exact decoration remain eligible for refinement.
- **Combobox results:** the home dropdown lists tours, contents and museums. Each row leads with a `ThemeIcon` naming its kind (tour: `grape → orange` gradient with `Route`, the tour identity; content: teal `BookOpen`; museum: blue `Landmark`), then the title over a dimmed subtitle/city, then `xs` badges: duration (light gray), difficulty (light), "{{count}} stops", and the locked price badge for a paid content. A paid content also carries the shared `PaidMark` right after its title (`src/components/mantine/PaidMark.tsx`: a small orange light `ThemeIcon` with the `Euro` icon of `PRICE_CURRENCY`, decorative because the price badge says the amount), so it reads as paid at a glance; the map Spotlight's paid results lead with the same component. Every visitor search field (home, marketplace, Spotlight, museum switch) ends with the shared `ClearSearchButton` (`src/components/mantine/ClearSearchButton.tsx`: a Mantine `CloseButton`, "Clear search") while it holds text; clearing a submitted marketplace query also drops `?q=`. All rows are plain options (the tour gradient icon already marks a tour; the former drawn-border animation per tour row was removed); options hold no nested buttons. With no result to show, the list says why: a loading line, "Nothing matches" with a hint and a "Browse all tours" option, or the failed request with a "Try again" option. The input keeps a visible focus treatment for keyboard users.
- **Rich text:** Mantine's TipTap `RichTextEditor` inside an `Input.Wrapper`, so it gets the same label, description and error as every other field. The toolbar is limited to formats that round-trip through Payload's Lexical storage: bold, italic, H2/H3, lists, quote, link, undo/redo. Every control has a translated label.
- **Dictation:** a field that accepts speech (the planner's Interests) carries a round `ActionIcon` in its `rightSection`: `subtle` `Mic` at rest, filled red `Square` while recording, a 14px `Loader` while transcribing. The words land in the field for the visitor to edit; nothing runs on its own. Its `aria-label` names the next action ("Dictate", "Stop dictating").
- **Domain inputs:** `PriceInput` is a euro `NumberInput` (`€ ` prefix, two fixed decimals, where empty means free). `ObjectPicker` is a searchable, clearable `Select` filtered on the server; `SubjectPicker` is the same field over subjects (artists, movements, events), both built on one `NamePicker`. Both carry a plain-language `description` that explains the rule behind the field.

### Navigation

- **ArtaroundTabs:** a moving 2px blue bottom indicator (`FloatingIndicator`) over `grow`-distributed tabs, optional icons, optional panels, and a `none` variant. Selected state is the underline, not a filled block Each panel sits `lg` below the tab bar (`sm` at the sides and bottom), so its first item never sticks to the indicator.
- **Site header (from `md`):** the bold `lg` "ArtAround" wordmark linking to the navigator, then the tab entries as horizontal `Button` links with a 16px leading icon (`light` when active with `aria-current="page"`, `subtle` otherwise, the same green/red/grape as the bottom bar) inside a `nav` landmark, the grape "My museums" with a trailing chevron. At the trailing edge sit the language switcher, the museum switch (at most 220px) and the account: a `subtle` button with a 24px avatar and the name truncated at `16ch`, linking straight to the profile as in the bottom bar, or a `default` "Sign in" with `LogIn`. "My museums" opens downward (`shadow="md"`). Entries, menu items and session state come from `nav-shared.tsx` and `getSiteChrome` (`src/lib/site-chrome.ts`), shared with the bottom bar so the two never drift; the account entry is built by one `toNavAccount` (`nav-account.ts`) on the server and the client alike, and links to the profile through `useNavState`'s `profileHref`.
- **Bottom app navigation (below `md`):** `grow` entries with an icon above an `xs` label. Navigator is green, Marketplace red, and the account entry blue. Signed out, it is a `LogIn` icon over "Sign in", linking to `/login?next=` the current page. Signed in, it becomes a 20px `Avatar` (photo, or initials from the name) over the display name clamped to one line (`maw="10ch"`), linking straight to the visitor's profile; "Sign out" lives on that profile (`SignOutButton`), not in a menu. The visible name is the button's accessible name (the avatar is `aria-hidden`). Until the client session has loaded, the tabs layout's server session supplies the id, name and avatar, so the entry shows the real visitor from the first paint. The account entry is never "active": profiles live outside the tabs. When the visitor holds a museum role, a grape "My museums" entry opens an upward menu that lists each museum with its role icon and dimmed role label (`Landmark` director, `Palette` curator, `BadgeCheck` verified creator). Entries are `light` when active and `subtle` otherwise, the active one sets `aria-current="page"`, and the language switcher lives in the top row, not here.
- **Tour header** (`TourNavigation`): a three-column row, the tour title over a dimmed `xs` position line ("Stop 3 of 14 · Room 6 · 25 min of reading left", or "All 14 stops visited"; parts the data can't support are left out, the reading time from `readingMinutes` in `src/lib/tour-summary.ts`), and at the trailing edge a subtle `X` link back to the tour page ("Leave the tour").
- **Contextual modal titles** (`NavigationModal kind`): the dialog says what it holds: "Artwork", "Content" or "Next stop". The step modal opens with the stop's picture as a `DetailCover` (no lightbox, `clamp(120px, 26dvh, 280px)` tall), so the visitor recognizes the work before reading.
- **Dialog close buttons:** `AppMantineProvider` gives every `Modal` and `Drawer` close button the name "Close" (a dialog's own `closeButtonProps` still wins).
- **Pagination** (`LabeledPagination`, `src/components/mantine/`): Mantine's `Pagination` inside a `nav` named "Result pages", every page button and arrow named ("Page 3", "Next page"). The search pages use it; a new paged list should too.
- **Tour progress:** a horizontally scrolling Mantine `Stepper` (`size="xs"`, `iconSize={24}`) whose active stop scrolls itself into view on change; clicking a stop opens that content without moving the tour cursor. When the museum has an entrance, an entrance step leads the stepper. A tour with a quiz ends with one more step, "Quiz", marked by a checklist icon; it is visible from the start and selectable at any time. Stops and scroll arrows retain at least 44px hit areas. Compact duration badges use the deeper museum-primary shade with automatic text contrast. Once the tour is complete, the directions strip's "Tour completed" state carries the primary "Take the quiz" at its end, with the same minimum hit area and wrapping label as other navigation actions.
- **Service routing buttons:** the 44px Services trigger opens a labelled Mantine popover of service, exit and wheelchair-route actions. Rows pair icons with wrapping labels; selected rows use `light` treatment and `aria-pressed`, while other rows use `default`. Service and exit actions route to the closest instance of their type; choosing an action closes the popover.
- **Tour content modals:** open in contextual Mantine modals while the map stays mounted; closing returns to the current tour context. Below `md` they are centered modals over a dimmed map. From `md` the same dialog (same routes, close and guest rules) docks as a right-side panel, `clamp(26.25rem, 34vw, 30rem)` wide, between the navigation header (whose measured height `TourNavigation` publishes as `--navigation-header-height`) and the navigation bar: no dimming overlay, no scroll lock, a 200ms `slide-left` entrance, and the map stays visible and draggable beside it. The skipped-stop modal is not a contextual modal and stays centered at every width. Their reading options (`?level=`, `?seconds=`, `?audience=`) and "Tell me more" angle (`?more=`) are URL state too, so a shared link opens the same text. Shareable modal URLs and explicit visitor position are behavioral requirements in PRODUCT.md and `docs/tour-navigation.md`; visual refinements must preserve them.
- **Free navigation:** the same map chrome without tour progress: the header is the museum's name over a dimmed `xs` "Free visit", the directions strip starts at "Choose where to go from search", and "Resume tour route" becomes "Clear destination". The empty Spotlight leads with **Tours in this museum** as `compact-sm` gradient pills (`grape → orange`, leading `Route` icon); tour results carry the same grape `Route` icon. Starting one keeps the visitor's position.
- **Group tours:** in a group, the host's URL is the group's URL. Guests follow the step, position, destination and open modal; their language, wheelchair route and reading options stay theirs (see `docs/group-tours.md`).
- **Spotlight:** the map's search affordance is a compound Mantine Spotlight over the museum-scoped catalog and every navigation command, deliberately separate from the tour's ordered progress. It opens with mod+K or "/" (`aria-keyshortcuts` on the search icon); from `md` the icon's tooltip, on hover and focus, reads "Search" with an `xs` `Kbd` "/". Escape in the Spotlight closes only the Spotlight, not a docked panel beneath it. An empty query shows command pills instead of an empty list (see Command pills).

### Quiz answers and feedback

The quiz's one bespoke control: calm, large, and honest about the result.

- **Answer option:** a full-width `Button size="lg"` (`answer-option`): `default` variant, `md` radius, at least 56px tall, label left-aligned and wrapping (`white-space: normal`, line-height 1.35, weight 500). Four per question, stacked with `sm` gaps inside a labelled group.
- **States:** idle → the chosen option shows Mantine's inline loader while the others stop responding → graded. The right option turns `light` green with ✓ + "Right answer"; a wrong pick turns `light` red with ✗ + "Your answer"; the rest stay default with dimmed text. Graded options are `aria-disabled`, never grayed out, so the comparison stays readable.
- **Feedback panel:** a bordered `md`-radius `Paper` below the options: a bold verdict in `feedback-correct` / `feedback-wrong` ("Correct!" / "Not quite."), the explanation as body text, and subtle `compact-sm` "Read the content again" buttons with a book icon. The panel sits in a polite live region; a wrong answer also announces the right one to screen readers.
- **Quiz progress:** a `sm` `Progress` whose filled section carries the tour gradient (`from-purple-700 to-orange-400`), the only place the gradient appears in the quiz.
- **Intro:** a grape `ListChecks` `ThemeIcon`, the tour title as the `h2`-sized heading, one dimmed line for length ("Final quiz · 5 questions · about 3 min"), a short `List` of three facts (one answer per question, the explanation after each, a score and how others did), a yellow `Alert` with a warning icon when stops are still ahead, then stacked actions: primary start/resume, default "Start over", subtle "Back to the tour".
- **Read again:** contents open in a right-side `Drawer` (`size="lg"`), never by navigating away from the quiz or results.

### Quiz results

- **Score:** a 160px `RingProgress` (14px stroke, round caps) whose single section is the score percentage: green from 50%, orange below. The score in the ring's center is the ring's label, not decoration beside it. A one-line verdict follows.
- **Comparison:** a plain sentence states the takeaway ("You did better than 62% of visitors"); a 180px `@mantine/charts` `BarChart` below shows the shape: no y-axis, grid, tick lines or tooltip, value labels on bars, own band in `chart-highlight` and named "(you)" on the axis. Below the statistics threshold, a dimmed sentence replaces both.
- **Review:** numbered prompt (dimmed tabular number), ✓/✗ lines for your answer and the right answer, dimmed explanation, an `xs` gray `Progress` with "n% of visitors got this right", and a read-again or "Stop not visited yet: open it" action. Items are separated by `Divider`s.
- **Closing actions:** the plugin's star rating (`LfrsRating`), then Share and Retake as an evenly split pair of `default` buttons, and Back to the navigator in the footer.

**The Chart-Follows-Sentence Rule.** A chart never carries the takeaway alone. The sentence above it states the finding; the chart adds the distribution, and its container exposes a text summary for screen readers.

### Inline editing (`src/components/editing/`)

Editing for allowed viewers happens on the visitor's own pages instead of a separate admin skin. An `EditableSection` puts an `h4`-sized title on the left and, on the right, an `xs` `light` "Edit" button with a trailing `Pencil` (a word, not a bare icon, so it reads as an action). While editing it turns into a gray "Cancel" with an `X` and `aria-pressed`, and the section's read view is swapped in place for its form. Other owner actions on the same document (`actions`, e.g. a `subtle` red `xs` Delete with a trailing `Trash2`) follow Edit in that header, the destructive one in the corner, and hide while the form is open, so nothing destructive stands next to Save. The profile keeps the bare `subtle` pencil `ActionIcon` (`iconOnly`) on "About me": its "Sign out" already sits at the name's height. Wherever an object, a content or a tour is edited or created (copies included), the form also picks its cover: `CoverImageInput` (`src/components/editing/CoverImageInput.tsx`), a preview of the current picture beside a file picker, saved by `saveCover` into the kind's upload collection with an `alt`. Simple metadata is edited this way; larger structures (new contents, tours, staff) get dedicated pages built from the same Mantine fields. The server decides who sees the controls, so the UI doesn't show disabled affordances to viewers who can't use them. Where the section's own content opens with the page's `h1` (content and object pages), `hideTitleFrom="md"` hides a bare section title for visitors on desktop, where it would read as a label above the heading; with Edit or other `actions` the header stays, since it carries them.

The museum color is its own section on the museum's Info tab, director only (`MuseumAppearanceForm`): a `ColorInput` (hex, typed or pasted, ten suggested swatches that already read well and avoid red and orange) with the description "Leave empty for the default blue". Under it the form explains the result before saving: a yellow `Alert` when the color was darkened, the two swatches "Your color" and "Used for buttons and links", and a live preview (a filled and a light button, a link, a badge) drawn in the museum's palette through a scoped `MantineProvider`. A refused red or orange shows the reason as the field error plus a `subtle` "Use #… instead" with the closest allowed color; Save stays disabled. "Reset to default" sits at the start of the actions row. The read view is one swatch and the hex, or "Default blue".

**The Edit-In-Place Rule.** Editing reuses the visitor's typography, spacing and Mantine controls. Don't introduce the neutral shadcn/editor layer or a dashboard look to visitor-facing pages because a form appeared on them.

### Museum services toolbar and panel (staff map editor)

This is the right-hand mirror of the creation toolbar: a vertical `Paper` with a `role="group"` label holding 44px `ActionIcon`s in marker colors. Service icons are `default` at rest and `light` with `aria-pressed` when they filter the panel; a `Divider` separates them from the entrance/exit placement tools. The sidebar panel lists service cards with the unplaced ones first. Each card has a round marker-colored action, filled when the service still needs placing and light with `MapPinPlus` once placed, an opening-hours field, and a subtle red remove.

### Directions strip (`DirectionsBar`)

The route one sentence at a time, sized for a glance while walking. A dimmed `xs` meta line ("Step 2 of 4 · about 6 m") sits above the current direction in `sm` weight 600. At a strip width of 22rem or more, the sentence is clamped to two lines beside its controls. Below that font-relative container width, the instruction spans the full row without a line clamp, above the arrow row; the assistant shares that control row. Subtle gray chevron `ActionIcon`s on either side step through the route; at either end they are disabled, not hidden. Tapping the sentence opens a Mantine `Modal` titled "Directions to …" with the full route as a `Timeline` (22px bullets, 2px line): a `Footprints` bullet per step, `MapPinCheck` for the arrival, the active item in weight 700, and every item clickable to jump there. From `md` the strip's width is capped (`flex: 0 1 40rem`) for a readable line. Chevron controls are 44px and the sentence button has at least the same hit height. The strip has a 48px minimum height and grows with its text. Before the visitor has a position, the strip is one full-width tappable row in the museum's light-variant text color (`--mantine-color-museum-light-color`): "Where are you? Find the work in front of you", which opens the position picker. Without a route, the same slot shows an icon (`Navigation`, `MapPinOff`, `MapPinCheck`) with a bold status line and an optional dimmed hint, in a polite live region.

**The One Strip Rule.** Route status and the current direction share one slot in the navigation bar. A new route state becomes a state of the strip, never another banner in the footer.

### Logistic directions (`LogisticNotes`, tour page)

The tour author's own directions, which the course specification keeps apart from items: the visit's practical information (entrance, tickets, cloakroom) before the first stop, then, per stop, how to reach it from the previous one (`src/lib/tour-logistics.ts`). In navigation they sit in the tour header, under the stepper, as one `UnstyledButton` row: a 16px `Signpost` then the notes in `xs`, clamped to two lines; tapping opens a Mantine `Modal` "Directions from the tour" with each note as an `sm` paragraph that keeps the author's line breaks. They show only while the route leads to the tour's stop (a destination the visitor picked hides them), and group guests see them too. On the tour page the practical information is a "Before you go" section (`h4`-sized title, `sm` text) between the figures and the actions, and each stop of the timeline carries its note as a dimmed `xs` line led by a 14px `Signpost`.

**The Author-Notes Rule.** The author's notes are text, not a route state: they live in the header, never in the directions strip, so they stay readable while the strip asks for a position (exactly when the first stop's notes matter) and never replace the computed route.

### Assistant orb (`AssistantOrb`, scoped signature)

The assistant's single identity: a 52px crystallized ball (React Bits `CrystalizedBall`, `ember` preset, `assistant-ember` particles, light theme) inside a round `UnstyledButton`, right-aligned in the navigation bar. It has no border, background or visible label; motion tells its state:

- **off:** paused and dim (glow 0.35). A tap opts in.
- **loading / ready:** a slow breath (speed 0.15). The microphone is closed.
- **listening / speaking:** speed, glow, crackle, sparks and flares scale with the live voice level, the visitor's mic first and then the assistant's own speech.
- **thinking:** a fast, high-crackle swirl at a fixed level.

Under `prefers-reduced-motion` the ball stays paused in every state. The button's `aria-label` says what a tap does now ("Talk to the assistant", "Stop listening"), `aria-pressed` is true only while listening, and a visually hidden polite status announces each state. Every reply also appears as a top-center notification titled with the visitor's quoted words, so an answer never exists only as audio.

**The One Crystal Rule.** The crystal/aura treatment belongs to the assistant orb and nowhere else. It is not background texture, not a card hover, and not a loading state. One orb per screen.

**The Mic-Closed-Looks-Calm Rule.** Only `listening` may look like it is hearing. If a change makes `ready` and `listening` hard to tell apart, the change is wrong.

### Command pills (navigation Spotlight)

With an empty query the Spotlight shows grouped rows of pills, "Nearby" first and then "Quick actions", each under a dimmed `xs` weight-600 heading. A pill is a `compact-sm` `light` `Button` with `radius="xl"`; a locked paid content's pill carries the locked price badge (`xs`) as its right section. Every command the assistant can run is reachable here or in the overlay controls, so voice is never the only way in. Typing switches the Spotlight to ordinary searchable actions.

### Nearby suggestion (notification)

Entering a room that holds off-tour contents shows one Mantine notification at top-center for 12 seconds, titled "Nearby in {room}". The content title (`sm`, weight 600, two lines) comes with the locked price badge when the content is paid, above the object name in dimmed `xs`, then two `compact-sm` actions: a filled "Open" and a `default` "Go there". A newer suggestion replaces the old one instead of stacking.

### Guidance settings and GPS simulator

The settings sit behind a `white`, `radius="xl"`, `lg` `SlidersHorizontal` icon in the control row. It opens a 260px popover of three `Switch`es, each with a one-line plain-language description (voice assistant, speak directions, nearby suggestions), then a full-width `xs` `SegmentedControl` for "Follow my position" (off / device / simulated, the last only in builds with the simulator), with any GPS error in red `xs` text beneath. The simulated-GPS pad is a `Paper withBorder shadow="sm" radius="md"` with a dimmed `xs` caption ("Simulated GPS · 2 m") over a 3×3 grid of `default` `lg` arrow `ActionIcon`s, each labelled "Walk north/east/…". On the map the GPS estimate is a small translucent navigation-blue sphere drawn through walls, separate from the confirmed-position avatar.

**The Estimate-Looks-Lighter Rule.** The GPS estimate is always drawn lighter than the confirmed position (a translucent dot against the avatar), so nobody reads an estimate as the shareable position.

### Reading options and "Tell me more" (content modals)

Two rows of `compact-sm` `radius="xl"` pills bracket a content's body, each pill with a 14px leading icon:

- **Reading options**, above the body: "Simpler" (`Feather`), "More in depth" (`GraduationCap`), "Shorter" (`Clock`, half the length, asked for in seconds), "For children" (`Baby`). At rest they are `default`, chosen ones `filled`, each with `aria-pressed`, in a `role="group"` labelled "Reading options". A pill that cannot apply (already easiest, or too short to halve) is disabled rather than hidden. Caption requests keep a minimum of three seconds. Once one is on, a `subtle` gray "Original" (`RotateCcw`) appears to undo them all. The chosen version takes the body's place under the same title.
- **Tell me more**, after the body: "Tell me more" (`BookOpen`), "Curiosities" (`Lightbulb`), "Its story" (`History`). Once one is open, a `subtle` `compact-sm` "Tell me even more" (`ChevronsDown`) adds the next step under the previous ones (`?step=`), up to four; the steps stay stacked, never replaced. They are neutral `default` at rest and `filled` when chosen. Both rows use `museum.8` with automatic text contrast for the selected state; this does not change the Spotlight's `light` command pills. Object modals get this row too; locked paid contents get neither row.

The text itself is plain paragraphs in the body's own typography, `margin-bottom: sm` between them, with `**bold**` and links as the only marks. A link opens the linked object or content in the tour's modal and keeps the visitor's position; once the text is complete, the linked entities repeat below it as 48px `md`-radius thumbnails over a two-line `xs` weight-600 title (72px wide). Before the first paragraph arrives, three 10px `Skeleton` lines (the last at 70%) hold its place; a failure is one dimmed `sm` line that says to try again in a minute. The container is a polite live region with `aria-busy` while text arrives.

**Listen** (`ContentAudioButton`): a `light` `compact-sm` `radius="xl"` pill with `Volume2` beside the duration chip under every readable content's title ("Listen" → `Pause` "Pause" while playing). While the audio is prepared it shows Mantine's loader in place and stays the same width; when it can't be produced it turns disabled with "Audio not available". It reads the page's language with the same synthetic voice as the assistant and never says so.

**Credits line** at the end of a content page: dimmed `xs` "© holder year · licence", the licence a link to its Creative Commons deed (`src/lib/content-rights.ts`), "All rights reserved" as plain text; above "Last updated".

**The Same-Voice Rule.** Generated text wears the museum's own voice: no chat bubbles, avatars, typing cursor, word-by-word streaming, sparkle icon, "AI" wording or "generated" badge. It arrives one whole paragraph at a time, and only the metadata (`generation` groups in Payload) tells it apart from authored text.

### Rights and visibility fields (content and tour forms)

The content form adds, after the price, a `VisibilityInput`: a labelled `SegmentedControl` "Public / Private" whose description says who will read it. Then a `Group grow` pair of `Select`s, "Rights holder" ("You, the author" or a museum where the author is curator or director) and "License" (disabled with a description when the content is paid, since paid means all rights reserved). A new content ends with one `Checkbox`, the author's declaration that the text is theirs. The tour form takes the same `VisibilityInput` under its cover, then an autosizing "Practical information" `Textarea`, and each stop of its timeline gets an `xs` autosizing `Textarea` "How to get here from the entrance / previous stop" under its title and controls. A new content not written as a tour stop starts with "What is it about?", a `SegmentedControl` labelled like `VisibilityInput` ("A work" / "An artist, style or event"), which swaps `ObjectPicker` for `SubjectPicker`. The object form adds "Wikidata" (`WikidataInput`, an `Autocomplete` of Wikidata items labelled "name · description · Q-id", with a link to the chosen item as its description) and "Inventory number".

### Subject page and work subjects

`/[lng]/subject/[id]` is a `Container size="sm"` reading column: a `light` gray kind badge (Person, Movement or style, Event), the `h1` name, the description, an `sm` link "On Wikidata (Q…)", then "Contents about it" and "Works in the collection" as compact `h4`-sized sections with plain lists of links. Signed-in visitors get a `light` "Write a content about it" `LinkButton` with `FilePlus` at the end, the same as the object page's. In object details the author is a dimmed `sm` line of links ("Raphael · c. 1514–1516") under the name, and movements are `light` gray badges linking to their pages.

### Plan my visit (form and preview)

An ordinary Mantine form, never a prompt: a searchable clearable `Select` for the museum (hidden in museum mode), a `md` full-width time `SegmentedControl` (30 min to 2 h), an autosizing Interests `Textarea` with dictation, and a wheelchair `Checkbox`. “More about your visit” opens the first/returning visit control and paired adult/child `NumberInput`s; each child gets an age field. The collapsed toggle summarizes the answers. Missing ages get inline validation; planning failures use a red `Alert`. The submit action uses `museum.8` with automatic text contrast and a loading state, with a polite status sentence below it.

The preview leads with the tour's `h1` title and dimmed description, time/stop badges and relevant route/family metadata, then the stops as a `Timeline` (22px bullets, 2px line, `Footprints` per stop, `MapPinCheck` for the last), each with a dimmed `sm` line “object · room · N min read”. A labeled `md` “Reading for” Select follows the stops when planned ages exist; Change / Start the visit share the next row, and the existing Start with a group form is reachable directly below. The local start action deepens the established tour gradient to `grape.9` → `orange.9` for its white label; `TOUR_GRADIENT` itself is unchanged.

Planner and reader descriptions use a relaxed line height (1.5) and pretty wrapping. Their local dimmed variable uses gray.7 in light and gray.5 in dark; planner validation uses red.8 in light and red.4 in dark. These are scoped refinements of Mantine forms, not a new global palette or body type scale. Group name form submission also uses `museum.8` with automatic text contrast.

**The Personal Reader Rule.** A family shares the works and host-led progress; each device chooses its own reader. The preview and group join reuse the labeled “Reading for” Select: Adult is the default, followed by the distinct planned child ages. Its description explains that language and detail change only on this device. Exact age remains in personal URL reading state across stops, versions and further explanations, never in shared group location state.

### Museum switch

A `light` `compact-sm` `radius="xl"` button: a leading `Landmark`, the label ("All museums" or the locked museum's name, truncated) and a trailing 12px `RefreshCw`, which reads as "switch museum" (a globe read as language or world). It opens a "Change museum" modal: a search `TextInput` (`Search` icon, autofocused, the shared clear X while it holds text) over one always-visible list of Mantine `NavLink` rows in a 360px `ScrollArea.Autosize`: "All museums" first (gray light `ThemeIcon` with `Globe`, hidden while searching), then every museum (light `ThemeIcon` with `Landmark` in that museum's own color, blue when it has none, name over the city as `description`). The current choice is `active` with a trailing `Check`; the switching row shows a 16px `Loader`. Below a `Divider` labelled "or", the developer path: a `subtle` gray `compact-sm` "Import a config file" (`FileUp`). Problems show as one orange `Alert` under the list. In museum mode every list in the app is scoped (search, marketplace, profile carousels, "tours with this content", Plan my visit); the tabs remount on a switch so client-side searches fetch again.

### QR codes (`QrCodeButton`, printable sheets)

Tours, objects and contents share one QR dialog: a `default` `ActionIcon` with `QrCode` (`lg` beside the tour's title; `xs` among the section's owner actions on object and content pages, where only the museum's staff see it), opening a centered `Modal` titled "Scan to open this …" with the code at `min(70vw, 280px)` and the item's title in dimmed `sm` under it. On screen the code is the plain, language-free URL. For the museum's staff (curator or director) a dimmed `xs` note says the downloaded code opens the app in this museum, then three downloads: a `filled` `compact-sm` "Download printable PDF" (`FileText`) and two `light` ones, SVG and PNG (`Download`). They are links to `/api/qr-sheet`, which builds them on the server, adds `?museum=<id>` and checks the right. The museum page offers staff a `subtle` `xs` "Print the QR codes of all objects" (`QrCode`) beside Staff.

The PDF is quiet and printable, not branded: Noto Sans (every app language, Greek and Cyrillic included), the museum name in gray `11pt` above a 9 cm code, the title in bold `20pt`, one line "Scan with your phone camera…", "ArtAround" small at the foot (A5). The museum sheet is A4 labels in two columns, each a 4.4 cm code beside its object's name, framed by a dashed cut line.

**The Black-Code Rule.** QR codes are black on white with a 4-module quiet zone, error correction Q when printed, and never wear the museum color or a gradient: cameras read contrast, and a code must still scan in a dim room.

### Museum-mode offer (`MuseumModeOffer`)

When a visitor arrives from outside the app (a code on someone's screen, a shared link) on a tour, object or content of a museum the app isn't locked to, a `light` primary `Alert` with `Landmark` leads the page: "Are you at {museum}?", a `subtle` gray "Not now" and a `compact-sm` "Use the museum's app". It is an offer, never a switch: only printed codes switch by themselves. It never shows while browsing inside the app, and "Not now" hides it for that museum for the session.

### Group tours (waiting room, group pill, locked modal, quiz board)

Same Operate restraint as the planner: one centered `Container size="xs"` column, Mantine defaults, no new color.

- **Join and start:** "Start with a group" is a `default` button with `UsersRound` beside "Start Tour"; it and the join page ask one thing, "Your name" (`@mantine/form` with the API's zod schema), remembered on the device. "Joining a group? Enter its code" is a `sm` `PinInput` of six alphanumeric boxes plus a filled "Join", on the navigator home and the tour's start page. The "Start with a group" modal opens with one dimmed `sm` line on what leading means, then the name field and the `Checkbox` "See everyone's quiz results" (with a description; off by default), then a full-width "Open the group". The join page shows the tour heading, "{host} invited you to visit this tour together.", a dimmed `sm` notice "{host} will see your score…" only when the host chose to see results, an orange light `Alert` when the visitor is already in another group, then the name form with "Join the group".
- **Waiting room:** the tour's 64px `md`-radius thumbnail beside its `h2`-sized title; then "Group code" (dimmed `sm`) over the code in **monospace 40px weight 700, 0.12em tracking**, the one monospace use, because the code is read aloud and copied letter by letter. The host gets a `Group grow` pair of `default` buttons ("Share link", "Show QR code" opening a centered QR modal), the member list between dividers, a `md` filled "Start the tour" (`Play`) and a `subtle` red "End the group tour". Guests see a dots `Loader` with "Waiting for {host} to start the tour" (or "{host} is not connected right now") and a `subtle` gray "Leave the group". Before connecting, an `xs` `Loader` and "Connecting to the group" stand in for the member list. Once started, the host's button reads "Back to the tour".
- **Group ended:** an unknown, mistyped or ended code gets a centered `h2`-sized "This group has ended", a dimmed line ("Ask for a new code, or visit the tour on your own.") and a `default` "Back to the navigator". Every device in an ended group gets a Mantine notification "The group tour has ended".
- **Requests (host only):** in the group panel, under the member list, a weight-500 `sm` "Requests" over one block per guest who asked something: the name with a `light` `sm` circle count, then one dimmed `xs` line per stop ("Stop 3: Easy wording, Shorter"). Guests see one dimmed `xs` line instead: "{host} sees what you ask for…".
- **Member list:** `sm` `Avatar` with initials (`color="initials"`), the name, a dimmed "(you)" on one's own row, and a `light` `sm` "Host" badge pushed right; a weight-500 `sm` count line above ("2 in the group"). A polite live region.
- **Group pill:** beside the tour title in the navigation header, a `light` `compact-sm` `radius="xl"` button with `UsersRound` and the head count; orange while the host is not connected (guests only), a 12px loader while connecting. It opens the "Your group" modal: members, the host's share pair, and End or Leave.
- **Locked guest modal:** the host's content modal without close button, Escape or outside close; a divider and a footer row with the dimmed `sm` status "{host} will continue when ready" and a `subtle` gray `compact-sm` "Leave the group". Reading options and "Tell me more" stay usable.
- **Host's quiz board:** `h2`-sized "Your group is taking the quiz" (then "Quiz results", or "The quiz is over" when scores are private) over the dimmed tour title, a weight-500 tabular "N of M finished" over the quiz's gradient `Progress`, then one row per guest: avatar, name, and at the end a dimmed tabular "1 of 2 answered", a green `Check` "Finished", or the bold score "1 of 2" with an "Answers" link to that guest's result page. Scores show only when the host ticked "See everyone's quiz results" (a `Checkbox` under the name in "Start with a group"); otherwise the dimmed line "Scores stay private: each person sees only their own." sits under the title and rows end at "Finished". The fixed footer holds one full-width `md` action: filled "End the quiz" (confirmed), then `light` red "End the group tour".

**The Follow-the-Host Rule.** In a group, guests never get a control that would move them away from the host (steps, destinations, "go to" commands, scanner, position); they keep every control that only changes how they read or move (language, reading options, Tell me more, wheelchair route). Hide such controls; don't disable them. This covers the stepper (read-only progress), the step modal's "Go to next step", the object actions, the directions strip's "Take the quiz", and the quiz's "Back to the map".

### Sign-in and sign-up (`src/components/auth/`)

Plain forms in the planner column (see Layout → Auth screens), nothing bespoke.

- **Fields:** Mantine `TextInput`/`PasswordInput` with required asterisks and the right `autoComplete`. Sign in asks one identifier, "Email or username". Sign up asks first and last name (side by side from `xs`, stacked on phones), username (with the hint "This is how other explorers will see you."), email, password (hint "At least 8 characters.") and confirm password. Validation is per field, inline under the input, on submit.
- **Server errors:** Payload's own message ("The email or password provided is incorrect.") in one orange `Alert` right above the submit, as in the planner.
- **Cross-link:** a centered `sm` row under the submit ("New to ArtAround? Create one" / "Already have an account? Sign in") that carries `?next=` along.
- **Profile sign out:** a `light` red `xs` button with a trailing `LogOut` (pointing out, after the word) at the top-right of the profile header, level with the name (identity left, account action right); red reads as "leave" at a glance. It shows `loading` and returns to the navigator. The profile stacks its identity block (avatar, name, @handle, badges) tight and separates it, the bio and the tabs with `xl` gaps.

### Checkout (Stripe sandbox)

- **Landing pages:** see Layout → Checkout landing pages. Success never trusts the redirect: it states what the purchases collection says. "Payment received" when the bought tour or content is owned, "Payment not confirmed yet" (it unlocks when Stripe confirms) otherwise, "Sign in to see your purchase" for a signed-out visitor. A Stripe reference, when present, is a dimmed `xs` line.
- **Checkout errors** stay where the action was taken: red `sm` text with `role="alert"` under the button that failed (the modal's "Buy all", `BuyButton`), never a page change.
- **Sandbox shop (`/[lng]/stripe-test`)** is a developer harness, not a product pattern.

### Media card (`DetailCover`, `PictureLightbox`, `ModelViewer`)

The one way a document's pictures and 3D model are shown at the top of its detail page; calm, the picture leads and the controls stay small.

- **Picture:** the first picture at the cover size, fetched with high priority (it is the page's largest paint); tapping it (`cursor: zoom-in`, "Open photos") opens every picture in `PictureLightbox` (`@mantine/lightbox`: swipe, zoom, thumbnails and arrows only with several pictures, all labels translated). Closed, the lightbox renders nothing; its code (`PictureLightboxDialog`) loads on the first open. It draws the original file; everything else draws a generated size, related-content rows included.
- **Controls:** bottom-right inside the card, `compact-sm` `white` buttons in dark text with a trailing icon: "Photos · N" (`Images`, tabular count) with more than one picture, and, when the object has a model, a "3D" toggle (`Box` cube icon) that becomes "Photo" (`Image` icon) with `aria-pressed`. They follow The Overlay Opt-In Rule, so the canvas below stays draggable.
- **3D view:** `ModelViewer` replaces the picture in the same card and height. React Three Fiber with drei, loaded only on the first press of "3D" (`React.lazy`, not `next/dynamic`). The model sits on a neutral **stage**: a radial gradient behind the transparent canvas (gray.0 to gray.3, dark.5 to dark.8 in dark), a soft contact shadow under it, plain hemisphere and two directional lights, no HDR environment. `CameraControls` orbit with one finger or the mouse and zoom with a pinch or the wheel, damped, distance-capped and stopped above the floor; the model is centred standing on the floor and fitted to the card, refitted when the card resizes. A Mantine `Loader` waits over the canvas while it loads; no WebGL or a broken file shows a dimmed sentence instead.
- **In modals:** `lightbox={false}`: the picture is not a button and "Photos" is hidden, because a full-screen viewer over a modal stacks two layers; the 3D toggle stays.

**The Generated Size Rule.** Upload collections generate a `card` (480px) and a `cover` (1280px) size, never enlarged (`src/fields/imageUpload.ts`). Read pictures with `PICTURE_SELECT` and draw them with `pictureSrc(picture, 'card' | 'cover')` (`src/lib/picture.ts`), which falls back to the original. Only the lightbox draws the original.

### Motion and small playful exceptions

- **Global search:** a four-second `BorderAnimate` cycle around the field, the navigator home's one moving accent.
- **Tour carousel:** stacked selection with a 500ms transition; a hover scale on the start action.
- **Navigator hero:** still. The title carries the page by size, not motion; the former `TypeWriterText` tagline (cycling colored words, a blinking cursor) was removed as a second competing effect.
- **Tabs:** the active indicator moves rather than jumping.
- **Added paragraphs:** each "Tell me more" or version paragraph settles in once, 420ms `cubic-bezier(0.16, 1, 0.3, 1)`, from 0 opacity and 4px lower; off under reduced motion. One entrance per paragraph, never per word.
- **Assistant orb:** the only continuously animated element during navigation, and only while the assistant is on. Its motion encodes state (see Assistant orb) and stops under reduced motion.

These are observed prototype choices, not blanket motion requirements. Prefer `prefers-reduced-motion`-safe behavior and Mantine `motion-*` variants where available; refine them for clarity and performance before treating them as polished patterns.

Two files in `src/components/ui` (`shine-border.tsx`, `orbiting-circles.tsx`) exist but are imported nowhere. They are unadopted candidates, not part of the system; adopt or delete them deliberately rather than treating their presence as endorsement.

**The Museum Address Rule.** Use one Mantine address autocomplete with the provider's full postal label. Derive structured city from the selection; expose City only in the manual-location disclosure. Reuse MuseumLocationMap for public information and the editor draft, with a bounded one-pin map, readable address and recovery link. Save address and geographic point together. This extension adds no global tokens; existing Mantine fields and shared FormActions remain the design-system primitives.

## Do's and Don'ts

### Do:

- **Do** use Mantine as the main visual foundation for visitor and staff task controls.
- **Do** preserve an approachable feel for casual museum visitors.
- **Do** keep the four namespaces distinct, and use semantic Mantine variables (`--mantine-color-*`) rather than hardcoding light surfaces.
- **Do** confine playfulness to small named components where it helps discovery or feedback (see The Scoped Playfulness Rule).
- **Do** keep content meaning available through labels and icons as well as color (see The Triplet Rule).
- **Do** use the `museum` color (or no color) for the common action, so museum mode re-skins it; use `ACCESSIBILITY_COLOR` for anything that says "accessible", and plain `blue` only for markers (see The Museum Primary Rule).
- **Do** keep QR codes black on white and build printed ones only through `/api/qr-sheet` (see The Black-Code Rule).
- **Do** preserve explicit position confirmation, shareable modal URLs, and the Overlay Opt-In pattern when touching navigation.
- **Do** source every museum-marker color and icon from `markers.ts` (see The Single Marker Table Rule).
- **Do** pair paid orange with a `Lock`/`ShoppingBag` icon and a price or label, and keep navigation available beside any unlock action.
- **Do** give every assistant capability a non-voice path: a command pill, an overlay control, or the directions modal.
- **Do** show route states inside the directions strip, and transient guidance as top-center notifications.
- **Do** offer generated help as named buttons, form fields and voice commands, and keep its state in the URL.
- **Do** improve prototype inconsistencies, accessibility, and responsive behavior while preserving the intended feel.
- **Do** put a focused task's single forward action full-width in the 64px footer below `md`, with the content inside `AppShellMain`; from `md` put outcome and summary actions inline, and keep the footer only for step flows (see The Thumb-Reach Rule).
- **Do** gate every desktop change at `md` and leave the phone layout as it is (see The Below-md-Unchanged Rule).
- **Do** stick panes at `var(--site-pane-top)` and bound them with `var(--site-pane-height)`, and offset in-page sticky headers by `var(--site-header-height, 0px)`, so they sit under the site header on desktop and at the top on phones. Don't rewrite the calc inline: a bare `2 *` in a Mantine style prop becomes rem and breaks it.
- **Do** build desktop detail pages as two Mantine `Grid` panes in the 1140px width, with the media or summary pane sticky where the other one scrolls; a page whose text is the point (content) keeps its reading column instead.
- **Do** grade answers with color + icon + word, and keep graded options readable rather than disabled-gray.
- **Do** state a chart's finding in a sentence first, and color only the viewer's own series (see The Highlight-One Rule).
- **Do** build sign-in, sign-up and checkout outcomes from the existing planner column and focused-task patterns rather than new chrome.
- **Do** show a checkout failure as text under the control that started it, and return the buyer to where the purchase began.
- **Do** open a detail page with its `DetailCover`, and let it carry the pictures (lightbox) and the 3D model; draw pictures at a generated size (see The Generated Size Rule).

### Don't:

- **Don't** treat every prototype measurement, gradient, or animation in this file as an immutable brand requirement.
- **Don't** turn ordinary forms and navigation into continuously animated showcases.
- **Don't** confuse Mantine tokens with the separate Pascal/editor CSS-token layer.
- **Don't** promote the orb's ember or the voice aura into a global motif, background, accent color, or loading treatment.
- **Don't** draw the GPS estimate like the confirmed position, or add a compass: the map is always north-up.
- **Don't** give group guests a disabled step or destination control; hide it (see The Follow-the-Host Rule).
- **Don't** label generated text or tours as AI, add sparkles, chat bubbles or a typing effect, or open a free prompt box (see The Same-Voice Rule).
- **Don't** present planned product capabilities or unverified accessibility compliance as implemented design evidence.
- **Don't** treat the unused `shine-border`/`orbiting-circles` primitives, or the hardcoded search copy, as settled design.
- **Don't** show disabled edit or delete controls to viewers who lack permission; omit them (see The Edit-In-Place Rule).
- **Don't** wrap quiz review items or result sections in cards; use spacing, compact headings and dividers.
- **Don't** add axes, grids or tooltips to small visitor-facing charts unless the reader needs to look up exact values.
- **Don't** treat the `stripe-test` sandbox shop as a product pattern, or say a purchase is unlocked before the purchases collection confirms it.
- **Don't** add another bottom-navigation entry until the 390px row stops truncating its labels.
- **Don't** open the picture lightbox from inside a modal, or build a separate gallery beside the cover.
- **Don't** show the site header on immersive surfaces (map navigation, scanner, map editor), or a second copy of the tabs' top row or bottom bar from `md`.
- **Don't** dim or scroll-lock the map behind a contextual panel on desktop; dock it beside the map.

<!-- Extraction sources: src/theme.ts (empty createTheme); src/app/[lng]/(frontend)/globals.css and layout.tsx; src/app/[lng]/(frontend)/(tabs)/{layout.tsx,NavBar.tsx,navigator/NavigatorPage.tsx}; tour/[id]/navigation/[stepId]/{TourNavigation.tsx,TourProgress.tsx}; src/components/mantine/{ArtaroundTabs,DifficultyBadge,DurationBadge,ArtAroundGlobalSearch,ToursCarousel,ContentsCarousel,ObjectsCarousel,TypeWriterText}.tsx; src/components/pascal/{museum-creation-toolbar,object-catalog}.module.css; src/components/agents-ui/agent-audio-visualizer-aura.tsx; src/components/ui/{shine-border,orbiting-circles}.tsx; Storybook docs for ArtaroundTabs, DifficultyBadge, ToursCarousel, ArtAroundGlobalSearch; package.json (Mantine 9.6.3, Tailwind v4, shadcn). Rendered navigator, tour carousel, and dark tabs were inspected in the prior pass; this refresh verified claims against source. 2026-10-19 merge: added src/components/editing/*, src/components/pascal/{MuseumServicesToolbar,MuseumServicesPanel}.tsx and their module CSS, src/lib/pascal/museum-plugin/markers.ts, (tabs)/NavBar.tsx (account + My museums), TourPage paid/locked treatment, ContentDetailsModal locked notice, MuseumPage owner actions and service avatars, TourProgress entrance step. 2026-10-19 extract: SearchResultCard/SearchResultsGrid and PLACEHOLDER_IMAGE consolidated from the three *SearchResults lists and five inline placeholder URLs. Tokens in theme.ts/globals.css were unchanged (only the @mantine/tiptap stylesheet import was added). 2026-10-19 merge (guidance, d8d9584): src/components/assistant/{AssistantOrb,NavigationAssistant,CrystalizedBall}.tsx; tour/[id]/navigation/[stepId]/{TourNavigation,DirectionsBar,NavigationSpotlight,GuidanceSettings,GpsSimulator,MuseumMap}.tsx and use-nearby-suggestions.tsx; src/components/mantine/LockedPriceBadge.tsx. 2026-10-20 merge (expansions, planned tours, museum mode): src/components/expansion/{ContentExpansion,ContentVersion,ExpansionText}.tsx and ContentExpansion.module.css; tour/plan/PlanVisitPage.tsx; src/components/mantine/MuseumSwitch.tsx; (tabs)/{layout.tsx,navigator/NavigatorPage.tsx}; rendered at 390px and 1280px through tests/e2e/content-expansion.e2e.spec.ts screenshots. 2026-10-20 merge (group tours): src/components/group/*, room/[code]/GroupRoomPage.tsx, tour/[id]/quiz/GroupQuizBoard.tsx, navigation/[stepId]/NavigationModal.tsx; rendered at 390px through tests/e2e/group-tour.e2e.spec.ts screenshots. 2026-10-20 merge (quiz, PR #1): tour/[id]/quiz/{TourQuiz,QuizContentDrawer}.tsx, quiz/result/[token]/QuizResult.tsx (+ stories), navigation/[stepId]/{TourProgress,TourNavigation,DirectionsBar}.tsx; @mantine/charts 9.6.3. 2026-10-20 merge (login branch): src/app/[lng]/(frontend)/(auth)/{layout,login/page,signup/page}.tsx, src/components/auth/{LoginForm,SignupForm,SignOutButton}.tsx, (tabs)/NavBar.tsx (avatar account menu), tour/[id]/TourPage.tsx (PurchaseModal checkout), checkout/{success,cancel}/page.tsx, stripe-test/page.tsx, src/components/payments/BuyButton.tsx; rendered at 390px and 1280px with a seeded local database. 2026-10-20 free navigation: museum/[id]/navigation, TourNavigation free scope, NavigationSpotlight tour pills, MuseumPage/content page CTAs, TourPage gradient start; rendered at 390px and 1280px. 2026-10-20 search and paid contents: ArtAroundGlobalSearch ResultRow, src/components/payments/{ContentUnlock,UnlockContentButton}.tsx, content page and navigation modals, tour/[id]/TourQrButton.tsx (QR button beside the title, opening the tour URL as a QR modal). Then conformed to this file: auth screens moved to the planner column (no card), checkout pages to focused task pages, account entry named by its visible name. 2026-10-29 merge (media): src/components/mantine/{DetailCover,PictureLightbox,PictureGrid,ModelViewer}.tsx (+ DetailCover stories), src/components/editing/CoverImageInput.tsx, src/fields/imageUpload.ts, src/lib/picture.ts; MuseumGallery removed; extract folded the lightbox open state into PictureLightbox's `index | null`; rendered at 390px on the object, museum and tour pages. 2026-10-30 simplify: PictureLightbox owns its lazy load (PictureLightboxDialog.tsx), the cover image is high priority, related-content rows draw through pictureSrc. 2026-10-29 desktop adaptation (brief .impeccable/surfaces/src-app-lng-frontend-layout-tsx.md): src/components/navigation/{SiteHeader.tsx,SiteHeader.module.css,nav-shared.tsx}, src/lib/site-chrome.ts, globals.css (--site-header-height), the two-pane detail pages, search pages, scan.module.css, checkout/CheckoutOutcome.tsx, museum/[id]/navigation/{TourNavigation,NavigationModal,NavigationSpotlight,TourProgress}.tsx and navigation-desktop.module.css, EditableSection hideTitleFrom, SearchResultCard href; rendered at 390px and 1280px. 2026-11-02 merge of db-populate: desktop rules re-applied over DetailCover (museum, object, tour), ActionFooter, the profile-link account entry and the museum-scoped navigation URLs. 2026-11-02 simplify + extract: --site-pane-top/--site-pane-height (globals.css), nav-account.ts (toNavAccount), TourNavigation SIDE_SPAN (responsive GridCol span instead of a CSS override), navigation-desktop.module.css without doubled-class overrides (Mantine and Tailwind are layered), ActionFooter inlineFrom/inlineProps replacing the per-page inline copy (tour, content, checkout); verified at 390px and 1280px. 2026-11-02 museum theme + QR (shape brief): src/theme.ts (`museum` primary color, ACCESSIBILITY_COLOR), src/lib/{museum-color,museum-palette,museum-theme,museum-cookie,qr-museum}.ts, src/lib/qr-sheet.tsx, src/app/api/qr-sheet/route.ts, src/proxy.ts, src/collections/Museums.ts (brandColor, palette), src/components/{QrCodeButton,MuseumModeOffer}.tsx, src/components/editing/forms/MuseumAppearanceForm.tsx, MuseumSwitch row colors; rendered at 390px and 1280px with a yellow (#fab005 → #aa6400) and a navy (#1b2a4a) museum, the color form, the QR dialog, the offer and the PDFs. 2026-11-03 one-screen navigator home: (tabs)/{layout.tsx,navigator/NavigatorPage.tsx} (StartVisual, CARD_BODY_CLASS, fit-screen spacer), globals.css variants from-sm/from-md/below-md/fit-screen; the Mantine-first, Tailwind-for-responsive rule; extract found no pattern used 3+ times (StartVisual and the start card appear twice, both on the home); rendered at 412×580, 412×625, 412×839, 768×1024, 800×400 and 1280×800.  2026-11-04 merge (requirements 18-33): src/components/mantine/{ContentAudioButton,DurationBadge,ObjectDetailsModal}.tsx, src/components/editing/{VisibilityInput,WikidataInput}.tsx, editing/forms/{ContentFields,ObjectMetadataForm,TourForm}.tsx, src/components/group/GroupRequests.tsx, GroupBadgePanel.tsx, content/[id]/ContentDetails.tsx (credits line, Private badge), tour/[id]/TourPage.tsx (Private badge), subject/[id]/page.tsx, expansion/{ContentExpansion,ContentVersion}.tsx; tokens unchanged; verified through stories (no new rendered screenshots: visual tests need approval). 2026-11-05 merge (logistics, subject contents): museum/[id]/navigation/{LogisticNotes,TourNavigation}.tsx, tour/[id]/TourPage.tsx, editing/forms/{TourForm,ContentForm}.tsx, editing/ObjectPicker.tsx (NamePicker, SubjectPicker), subject/[id]/page.tsx; tokens unchanged; extract found nothing to move (the Signpost note appears in two different shapes: a tappable header row and a timeline line); rendered at Pixel 7 size through Playwright screenshots. -->
