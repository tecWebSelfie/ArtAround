---
name: ArtAround
description: An approachable Mantine visitor interface with small playful discovery accents, over a separate neutral staff editor layer.
colors:
  navigation-blue: '#228be6'
  navigation-blue-hover: '#1c7ed6'
  tour-purple: '#7e22ce'
  tour-orange: '#fb923c'
  content-teal: '#12b886'
  grape: '#be4bdb'
  easy-green: '#40c057'
  medium-yellow: '#fab005'
  hard-red: '#c92a2a'
  voice-aura: '#1FD5F9'
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
  tab-active:
    textColor: '{colors.navigation-blue}'
  floating-toolbar:
    backgroundColor: '{colors.surface-light}'
    rounded: '{rounded.md}'
    padding: '0.375rem'
---

# Design System: ArtAround

<!-- Prototype-derived visual guidance confirmed with the user. This records the intended feel and the muscle memory of the incumbent code, not a claim that every detail is polished, accessible, or finished. Where the code is mid-refactor, the description is deliberately provisional. -->

## Overview

**Creative North Star: "The Adaptable Museum Companion"**

ArtAround should feel familiar and approachable to casual museum visitors as well as staff. Mantine is the main design system: recognizable controls, clear labels, system typography, neutral surfaces, and straightforward task flows provide the foundation. The existing UI is the main suggestion for the product's feel, but remains a prototype rather than a finished specification.

The system is best described as **one product over four namespaces**. They coexist in the same runtime and dress very different jobs:

1. **Visitor Mantine UI** — the visitor-facing interface. `src/theme.ts` is an empty `createTheme({})`, so the palette is Mantine's stock tokens plus Tailwind utilities; this layer is the brand authority for the visitor experience.
2. **shadcn / editor token layer** — Tailwind v4 `@theme inline` plus `:root` / `.dark` OKLCH variables (background, foreground, primary, border). Neutral by design; it is not Mantine's palette and should not be mistaken for it.
3. **Pascal editor and viewer** — the staff map editor and museum viewer, styled largely by `@pascal-app/*` module CSS and Tailwind `dark:` variants. Task-dense, dark-neutral, functionally layered.
4. **LiveKit `agents-ui`** — the emerging voice/assistance layer: shader-driven visualizers whose default accent is a cyan aura. Currently a fourth namespace with exactly one sanctioned expression (see Components → Voice affordance), not a global motif.

Playfulness belongs in small key components. Existing examples include the purple-to-orange tour carousel, the animated search border and its reflection, the cycled hero word, and selected discovery accents. These establish permission for selective expression; they do not require every page or control to animate or become decorative. Future refinement can improve consistency, spacing, accessibility, and responsive behavior while keeping this approachable character.

**Key Characteristics:**

- Familiar and approachable Mantine controls as the visitor-facing foundation.
- Neutral light and dark surfaces with clear task hierarchy.
- Four coexisting style namespaces that must not be blended.
- Small playful exceptions in museum discovery, scoped and few.
- Functional depth for overlays and floating controls.
- Prototype-informed direction with room for refinement.

**The Two-Namespace Rule.** Mantine color tokens and the editor's OKLCH tokens are distinct sources of truth in the incumbent code. Treat them as separate namespaces rather than one blended palette; do not "harmonize" one into the other as a side effect of a local change.

**The Scoped Playfulness Rule.** Decorative motion and gradient belong to named discovery components. If a playful treatment is being added to an ordinary form, list, or navigation element, it is out of scope by default.

## Colors

The palette is Mantine's stock control palette plus Tailwind gradient stops, with a separate neutral OKLCH layer for the editor. It is deliberately plain at rest: color carries identity on discovery cards, badges, and a few controls rather than across whole surfaces.

### Primary

- **Navigation blue** (`navigation-blue`, Mantine blue.6): the common-action color and the moving active-tab underline (`border-b-(--mantine-color-blue-6)` on the `FloatingIndicator`). Its hover step is blue.7. Links use the darker blue.8 step with a hover underline.
- **Navigation blue hover** (`navigation-blue-hover`, Mantine blue.7): the pressed/hover partner of the above. It is not the only navigation color — the bottom navigator entry is green and marketplace entry is red.

### Secondary

- **Tour purple / tour orange** (`tour-purple`, `tour-orange`): the tour identity. The card's diagonal gradient is Tailwind `from-purple-700 to-orange-400`, echoed literally in an SVG gradient (`#7e22ce` → `#fb923c`) and in gradient-clipped heading text. Some labels use the Mantine `grape → orange` gradient instead; related treatment, not an identical token.
- **Grape** (`grape`, Mantine grape.6): the tour de-emphasis/control accent. Tour card borders and the carousel's previous/next controls currently use `border-mantine-grape-6`.
- **Content teal** (`content-teal`, Mantine teal.6): the content identity. Content outlines use Tailwind `border-teal-600` (`border-2`), and content headings use a Mantine `teal → cyan` gradient. Preserve the distinction when tracing styles; do not silently substitute one value for another.
- **Voice aura** (`voice-aura`): the default accent of the `agents-ui` shader visualizer (`#1FD5F9`). Recorded as evidence of the current default, not as a palette commitment — the assistance affordance is not shipped, and this value has not been reconciled with the Mantine palette.

### Neutral

- **Light surface / subtle surface** (`surface-light`, `surface-subtle`): white and Mantine gray.0. Objects use relatively plain image-led presentation so the museum image or object can lead.
- **Dark surface / dark control / dark border / dark-scheme text**: the rendered Mantine dark theme uses the corresponding frontmatter values. Prefer Mantine's semantic variables over hardcoded light surfaces so scheme switching keeps working.
- **Editor neutral tokens** (`editor-background`, `editor-foreground`, `editor-primary`, `editor-border`): the OKLCH values recorded above drive the global `--background`, `--foreground`, `--primary`, and `--border` in light mode; `.dark` supplies their alternates. Editor primary is neutral and is not Mantine navigation blue.
- **Dimmed text**: supporting copy uses Mantine's `dimmed` token (e.g. catalog hints); the navigator's "Or" divider label uses gray.7.

### Named Rules

**The Triplet Rule.** Difficulty and status are never carried by color alone. The incumbent renders label + icon + color together (`Leaf`/green, `Gauge`/yellow, `Flame`/red.9). Keep all three when restyling.

## Typography

**Headline and body font:** Mantine's system sans-serif stack, recorded in frontmatter. No distinct branded display font is established. The separate Tailwind heading alias resolves to the same `--font-sans`, so it does not establish another typeface.

**Character:** familiar, readable, and practical. Typography should support museum content and quick decisions without requiring visitors to learn an editorial hierarchy unique to the app.

### Hierarchy

- **Headline:** Mantine h1, 2.125rem, weight 700, line-height 1.3; currently on the navigator entry screen.
- **Section heading:** Mantine h2, 1.625rem.
- **Title:** Mantine h3, 1.375rem; observed in object details.
- **Compact heading:** Mantine h5, 1rem; used in the tour-navigation header.
- **Body:** 1rem with default line-height 1.55; supporting text commonly uses 0.875rem, and compact footer labels 0.75rem.
- **Label:** 0.875rem. Badge casing follows the component treatment rather than becoming a global uppercase rule.

These are inherited Mantine values, not a new custom scale. The prototype does not establish a universal reading-column width. Text blocks lean on Mantine's `textWrap="balance"` and `lineClamp` rather than a fixed measure.

### Named Rules

**The Gradient-Span Rule.** A gradient is applied to a fragment of text (a single word or short label) with `inherit` sizing, never to a paragraph. The navigator hero colors exactly one word this way.

## Layout

Stack and Group compose most visitor interfaces. The app shell reserves a 64px footer and an auto-height header, and the tabbed area's footer holds a bottom navigation group with icon-plus-label entries and a language switcher. This is an incumbent pattern, not proof that every prototype page currently handles footer overlap correctly.

Use the Mantine spacing vocabulary in frontmatter. Compact editor CSS also uses 0.375rem, 0.5rem, and 0.75rem gaps or padding; these are local layout measurements rather than additions to Mantine's named scale.

Content and object carousels show 60% slide width at base, 33.3333% at `sm`, and 25% at `md`, with `sm` slide gaps. The inherited breakpoints are `xs: 36em`, `sm: 48em`, `md: 62em`, `lg: 75em`, and `xl: 88em`.

**Tour navigation** is a full-viewport composition under the shared shell: an `rounded-b-xl` header stacks the tour title, a linear `Progress` bar between start/finish icons, and a horizontally scrolling `Stepper` of tour stops; the main area is `100dvh` with `overflow-hidden` and holds the map; a `rounded-t-md` footer holds the primary advance action and any route status. Controls that must float above the canvas live inside an `Overlay backgroundOpacity={0}` with `pointerEvents: 'none'`, and each interactive child opts back in with `pointerEvents: 'auto'` — a pattern worth preserving, since it keeps the map draggable underneath.

The museum map supports floating task controls. The staff creation toolbar is positioned at top 4.5rem and left 0.75rem, with bounded height and vertical scrolling; the object catalog keeps a scrollable body and wraps its actions. These measurements describe current layouts; they should be refined when content, touch use, or viewport constraints expose defects.

### Named Rules

**The Overlay Opt-In Rule.** Floating controls over a map or canvas sit in a transparent, non-interactive overlay container; each control re-enables pointer events on itself. Never give the container pointer events back.

## Elevation & Depth

Depth is functional: restrained shadows distinguish floating controls and overlays from their background. Mantine's shadow vocabulary does the work, and the tour card is the one place where depth is allowed to be decorative.

- **Toolbar** (`var(--mantine-shadow-xs)`): separates the editor creation controls from the canvas.
- **Small surface** (`var(--mantine-shadow-sm)`): the inherited step used by plain `Card shadow="sm"` surfaces such as search results and the QR paper.
- **Tour card** (`var(--mantine-shadow-lg)`): supports the layered tour treatment.

The animated search is a deliberate exception rather than an elevation step: a `BorderAnimate` wrapper runs a four-second border cycle around the input, and the navigator wraps the whole search in `Reflection` with a subtle ripple and a soft shadow (`shadowOpacity 0.2`, `shadowBlur 5.51`, `shadowSize 29`). Treat those as part of the discovery accent, not as a reusable depth token.

### Named Rules

**The Functional-First Rule.** Shadows appear because something floats or overlays. Marketing-style ambient shadow on ordinary content is not part of the incumbent vocabulary.

## Shapes

Mantine provides the main radius scale: `xs` through `xl` in frontmatter, with `sm` as its ordinary default. Rounded images and cards coexist with pill-like search and badge controls: the global search is `radius="xl"` (32px), the tour tag badge and difficulty chips are fully round, and the newest circular controls (`Scan` pill, service icons, the microphone button) use `rounded-full`.

The editor's `--radius` is separately 0.625rem, with derived multipliers in the global stylesheet. Do not mistake this for a replacement of Mantine's radius scale. Border-based grouping and image cropping remain useful even where shadows are present: content cards use a 2px teal outline, and content/object modals crop images to a `radius="md"` frame.

### Named Rules

**The Inherit-Radius Rule.** Nested surfaces take their radius from the parent (`rounded-[inherit]`) rather than inventing a new value; this is what keeps the `BorderAnimate` wrapper flush with the input it decorates.

## Components

Each component below leads with its character, then shape, color assignment, states, and any distinctive behavior. Everything here is observed prototype behavior.

### Buttons

- **Shape:** Mantine `sm` radius except deliberate full-round pills.
- **Primary:** filled navigation blue; the `Scan` action is a `size="compact-xl"` dark full-round pill with a trailing icon, so it reads as a tool rather than a form action.
- **Hover / Focus:** inherited Mantine states; the start-tour action additionally scales on hover.
- **Supporting:** `variant="default"` for a calm second action ("Resume tour route"), `variant="light"` for service icons, `variant="white"` for floating icons over the map, `subtle` for an inactive bottom-nav entry.
- **Icon-only:** canvas and floating actions must carry both a tooltip (`title`) and an accessible label (`aria-label`). Toggle-style icons expose `aria-pressed`.

### Chips / Badges

- **Difficulty:** label + icon + semantic color (see The Triplet Rule). Compact contexts may hide the label (`withLabel={false}`) while keeping the icon, or keep the label with a compact duration chip beside it in a stepper description.
- **Duration:** a clock icon with a compact minute label (`12'`).
- **Category pills:** white surfaces with colored or gradient text — `Badge variant="white"` with a teal border on contents, `variant="gradient"` for section labels. Category appearance and difficulty meaning are separate concerns.

### Cards / Containers

- **Search-result card:** the recurring calm container — `Card shadow="sm" padding="sm" radius="md" withBorder`, appropriate for listings.
- **Content cards:** teal `border-2` outlines with square-ish image areas and `rounded-xl` framing.
- **Tour cards:** purple/orange framing, grape borders, stacked selection, and explicit previous/next controls.
- **Object detail images:** a 16:9 area with `md` radius.
- Reuse these distinctions where helpful, without copying prototype inconsistencies as requirements.

### Inputs / Fields

- **Ordinary forms:** Mantine `TextInput` and `Textarea` with labels, descriptions, required indicators, errors, and disabled states as documented in Storybook.
- **Global search (the exception):** a large rounded input (`size="lg"`, `radius="xl"`) with a search icon, a hardcoded `1px solid purple` border, and an animated `BorderAnimate` surround on a four-second cycle. In the navigator it is additionally wrapped in `Reflection`. Its incumbent hardcoded copy and exact decoration remain eligible for refinement.
- **Combobox results:** dropdown options for tours are wrapped in `BorderAnimate variant="draw"`; the input keeps a visible focus treatment for keyboard users.

### Navigation

- **ArtaroundTabs:** a moving 2px blue bottom indicator (`FloatingIndicator`) over `grow`-distributed tabs, optional icons, optional panels, and a `none` variant. Selected state is the underline, not a filled block.
- **Bottom app navigation:** green Navigator and red Marketplace, `light` when active and `subtle` when inactive, with a separate language switcher.
- **Tour progress:** a horizontally scrolling Mantine `Stepper` (`size="xs"`, `iconSize={24}`) whose active stop scrolls itself into view on change; clicking a stop opens that content without moving the tour cursor.
- **Tour content modals:** open in contextual Mantine modals while the map stays mounted; closing returns to the current tour context. Shareable modal URLs and explicit visitor position are behavioral requirements in PRODUCT.md and `docs/tour-navigation.md`; visual refinements must preserve them.
- **Spotlight:** the map's search affordance is a Spotlight over the museum-scoped catalog, deliberately separate from the tour's ordered progress.

### Voice affordance (scoped signature; not yet shipped)

The navigator entry screen already offers a large circular microphone button (`rounded-full`, `size={rem('clamp(72px, 22vw, 150px)')}`, filled, `autoContrast`) with a plain-language label. The intended richer expression is the user-supplied crystallized-ball reference recorded in PRODUCT.md, and the `agents-ui` shader visualizer supplies its technical vocabulary today (cyan `#1FD5F9` default, `cva` size steps, agent-state-driven motion). This is exactly **one** affordance for opt-in assistance.

**The One Crystal Rule.** The aura/shimmer treatment belongs to the assistance affordance and nowhere else. It is not background texture, not a card hover, and not a loading state.

### Motion and small playful exceptions

- **Global search:** a four-second `BorderAnimate` cycle, plus `Reflection` ripple.
- **Tour carousel:** stacked selection with a 500ms transition; a hover scale on the start action.
- **Navigator hero:** `TypeWriterText` cycles one word (`creators` / `curators` / `museums`) with per-word color (`red.8` / `green.8` / `blue.8`) and a gray fallback.
- **Tabs:** the active indicator moves rather than jumping.

These are observed prototype choices, not blanket motion requirements. Prefer `prefers-reduced-motion`-safe behavior and Mantine `motion-*` variants where available; refine them for clarity and performance before treating them as polished patterns.

Two files in `src/components/ui` (`shine-border.tsx`, `orbiting-circles.tsx`) exist but are imported nowhere. They are unadopted candidates, not part of the system; adopt or delete them deliberately rather than treating their presence as endorsement.

## Do's and Don'ts

### Do:

- **Do** use Mantine as the main visual foundation for visitor and staff task controls.
- **Do** preserve an approachable feel for casual museum visitors.
- **Do** keep the four namespaces distinct, and use semantic Mantine variables (`--mantine-color-*`) rather than hardcoding light surfaces.
- **Do** confine playfulness to small named components where it helps discovery or feedback (see The Scoped Playfulness Rule).
- **Do** keep content meaning available through labels and icons as well as color (see The Triplet Rule).
- **Do** preserve explicit position confirmation, shareable modal URLs, and the Overlay Opt-In pattern when touching navigation.
- **Do** improve prototype inconsistencies, accessibility, and responsive behavior while preserving the intended feel.

### Don't:

- **Don't** treat every prototype measurement, gradient, or animation in this file as an immutable brand requirement.
- **Don't** turn ordinary forms and navigation into continuously animated showcases.
- **Don't** confuse Mantine tokens with the separate Pascal/editor CSS-token layer.
- **Don't** promote the voice aura into a global motif, background, or loading treatment.
- **Don't** present planned product capabilities or unverified accessibility compliance as implemented design evidence.
- **Don't** treat the unused `shine-border`/`orbiting-circles` primitives, or the hardcoded search copy, as settled design.

<!-- Extraction sources: src/theme.ts (empty createTheme); src/app/[lng]/(frontend)/globals.css and layout.tsx; src/app/[lng]/(frontend)/(tabs)/{layout.tsx,NavBar.tsx,navigator/NavigatorPage.tsx}; tour/[id]/navigation/[stepId]/{TourNavigation.tsx,TourProgress.tsx}; src/components/mantine/{ArtaroundTabs,DifficultyBadge,DurationBadge,ArtAroundGlobalSearch,ToursCarousel,ContentsCarousel,ObjectsCarousel,TypeWriterText}.tsx; src/components/pascal/{museum-creation-toolbar,object-catalog}.module.css; src/components/agents-ui/agent-audio-visualizer-aura.tsx; src/components/ui/{shine-border,orbiting-circles}.tsx; Storybook docs for ArtaroundTabs, DifficultyBadge, ToursCarousel, ArtAroundGlobalSearch; package.json (Mantine 9.6.3, Tailwind v4, shadcn). Rendered navigator, tour carousel, and dark tabs were inspected in the prior pass; this refresh verified claims against source. -->
