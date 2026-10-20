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
  paid-orange: '#fd7e14'
  marker-red: '#fa5252'
  exit-red: '#ff8787'
  assistant-ember: '#FF8A2A'
  voice-aura: '#1FD5F9'
  feedback-correct: '#2f9e44'
  feedback-wrong: '#e03131'
  chart-highlight: '#ff922b'
  chart-muted: '#ced4da'
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
    height: '3rem'
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

- **Navigation blue** (`navigation-blue`, Mantine blue.6): the common-action color and the moving active-tab underline (`border-b-(--mantine-color-blue-6)` on the `FloatingIndicator`). Its hover step is blue.7. Links use the darker blue.8 step with a hover underline.
- **Navigation blue hover** (`navigation-blue-hover`, Mantine blue.7): the pressed/hover partner of the above. It is not the only navigation color — the bottom navigator entry is green and marketplace entry is red.

### Secondary

- **Tour purple / tour orange** (`tour-purple`, `tour-orange`): the tour identity. The card's diagonal gradient is Tailwind `from-purple-700 to-orange-400`, echoed literally in an SVG gradient (`#7e22ce` → `#fb923c`) and in gradient-clipped heading text. Some labels use the Mantine `grape → orange` gradient instead; related treatment, not an identical token.
- **Grape** (`grape`, Mantine grape.6): the tour de-emphasis/control accent. Tour card borders and the carousel's previous/next controls currently use `border-mantine-grape-6`. It also marks the staff side of the bottom navigation: the "My museums" entry is grape, which keeps it apart from the visitor-facing green Navigator and red Marketplace.
- **Paid orange** (`paid-orange`, Mantine orange.6): the color of acquisition and of locked content. It appears on the "Unlock for €…" button, the tour's "Edit/Customize tour" action, the `Lock` price badge on locked tour contents, and the orange `Alert` that replaces the body of a paid content the viewer isn't entitled to. It always comes with a `Lock`, `ShoppingBag` or `Pencil` icon and a label.
- **Content teal** (`content-teal`, Mantine teal.6): the content identity. Content outlines use Tailwind `border-teal-600` (`border-2`), and content headings use a Mantine `teal → cyan` gradient. Preserve the distinction when tracing styles; do not silently substitute one value for another.
- **Assistant ember** (`assistant-ember`): the orb's particle color, from the user-supplied ember reference. It lives inside the orb's WebGL canvas and nowhere else: no button, badge or border takes it. By hue it is close to paid orange, and the two never get confused, because the orb carries no text while an acquisition control always carries a `Lock`/`ShoppingBag` icon and a price.
- **Voice aura** (`voice-aura`): the default accent of the legacy `agents-ui` shader visualizer (`#1FD5F9`), which no screen renders any more. It is evidence of that older layer, not a palette commitment. New assistance UI uses the ember orb.

### Tertiary: museum markers

A small semantic set that comes from one source: `SERVICE_META` / `EXIT_ENTRANCE_META` in `src/lib/pascal/museum-plugin/markers.ts`. Each marker kind carries an icon, a Mantine color name for badges, avatars and action icons, and a matching hex for three.js materials. The visitor's service buttons, the museum page's service avatars, the staff services toolbar and panel, and the 3D map pins all read this table, so a service looks the same in 2D and in 3D.

- **Toilets / entrance:** navigation blue (`Toilet`, `LogIn`).
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
- **Dimmed text**: supporting copy uses Mantine's `dimmed` token (e.g. catalog hints); the navigator's "Or" divider label uses gray.7.

### Named Rules

**The Highlight-One Rule.** A chart colors exactly one series or bar: the visitor's own. Everything else is `chart-muted`. If nothing belongs to the viewer, the chart is single-hue.

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

- **Counters and scores:** progress counters ("Question 3 of 5"), the result score and numbered review items use tabular numerals (`font-variant-numeric: tabular-nums`) so digits do not jitter as they change. The result score is the one oversized number (36px, weight 800, with a dimmed 20px "/total").

### Named Rules

**The Gradient-Span Rule.** A gradient is applied to a fragment of text (a single word or short label) with `inherit` sizing, never to a paragraph. The navigator hero colors exactly one word this way.

## Layout

Stack and Group compose most visitor interfaces. The app shell reserves a 64px footer and an auto-height header, and the tabbed area's footer holds a bottom navigation group with icon-plus-label entries and a language switcher. This is an incumbent pattern, not proof that every prototype page currently handles footer overlap correctly.

Use the Mantine spacing vocabulary in frontmatter. Compact editor CSS also uses 0.375rem, 0.5rem, and 0.75rem gaps or padding; these are local layout measurements rather than additions to Mantine's named scale.

Content and object carousels show 60% slide width at base, 33.3333% at `sm`, and 25% at `md`, with `sm` slide gaps. The inherited breakpoints are `xs: 36em`, `sm: 48em`, `md: 62em`, `lg: 75em`, and `xl: 88em`.

**Tour navigation** is a full-viewport composition under the shared shell: an `rounded-b-xl` header stacks the tour title, a linear `Progress` bar between start/finish icons, and a horizontally scrolling `Stepper` of tour stops; the main area is `100dvh` with `overflow-hidden` and holds the map; a `rounded-t-md` footer is the **navigation bar**: about four fifths of it (`flex-[4]`) is the directions strip, and the remaining fifth right-aligns the assistant orb. Route states (finding a route, no route, tour complete, no position yet) are states of that strip, not separate footer messages. "Open next stop" and "Resume tour route" live in a centered button pair that floats just above the map's control row. Controls that must float above the canvas live inside an `Overlay backgroundOpacity={0}` with `pointerEvents: 'none'`, and each interactive child opts back in with `pointerEvents: 'auto'` — a pattern worth preserving, since it keeps the map draggable underneath.

Inside that overlay the visitor's map controls stack from the bottom: the next-stop/resume pair, then one row holding the vertical service-and-exit `ActionIconGroup`, the wheelchair toggle, the `Scan` pill, the search icon and the guidance-settings icon. When simulated GPS is on, its D-pad floats top-left below the header (`pt-36`), clear of the stepper.

The museum map supports floating task controls. The staff creation toolbar is positioned at top 4.5rem and left 0.75rem, and the museum services toolbar mirrors it at top 4.5rem and right 0.75rem. Both are vertical, have bounded height (`calc(100% - 10rem)` on the services side) and scroll vertically. The object catalog and services panel keep a scrollable body (services rows cap at 60vh) and wrap their actions.

Every tab page (navigator, marketplace) opens with one right-aligned row above its content holding the **museum switch** (see Components → Museum switch). In museum mode the whole app is scoped to that museum, so the switch is the visible reminder of the lock.

**Plan my visit** (`/[lng]/tour/plan`) is a single centered column (`Container size="xs"`, `py="xl"`, `Stack gap="lg"`): an `h1` with a dimmed one-line intro, then the fields top to bottom, then one full-width primary button. Adults and children's ages share a `Group grow` row. The preview replaces the form in the same column rather than opening a modal, and ends with a `Group grow` pair: `default` "Change" and filled "Start the visit". On the navigator home its entry is the right half of the "Or" row, mirroring the QR scan on the left: a large round filled `ActionIcon` with a `Route` icon over a two-line `xs`/`sm` caption.

Detail pages for museums, objects, contents and tours stack read-only sections. When the viewer may edit, owner actions appear inline as a compact row of `size="xs"` `light` link buttons (map, tour, new content), with `subtle` used for lower-priority staff management. Editing never moves to a separate admin chrome; it happens where the content is read. These measurements describe current layouts; they should be refined when content, touch use, or viewport constraints expose defects.

**Focused task pages** (the end-of-tour quiz and its results) leave the map layout entirely: a single `Container size="xs"` reading column (540px, `md` side padding) inside `AppShellMain`, so the shell reserves room for the fixed 64px `AppShellFooter`. The footer carries exactly one full-width forward action ("Next question", "See your results", "Back to the navigator"); secondary actions stay in the column. The quiz adds a sticky in-column header (back icon, tour title, "Question n of N", progress bar) on the body background. Sections on the results page are separated by `xl` stack gaps and titled with compact `h4`-sized headings; review items are a divided list, not cards.

**Auth screens** (`/[lng]/login`, `/[lng]/signup`) reuse the Plan my visit column exactly (`Container size="xs"`, `py="xl"`, `Stack gap="lg"`): an `h1` with a dimmed one-line intro, the fields, one full-width primary action. They sit outside the tabs group, so there is no bottom navigation, and no card or shadow around the form (The Functional-First Rule). Signed-in visitors never see them; they are redirected to their profile.

**Checkout landing pages** (`/[lng]/checkout/success`, `/cancel`) are focused task pages (below): the outcome as an `h1` with a dimmed explanation in the `xs` column, and the way back ("Back to the tour" / "Back to the navigator", or "Sign in" when signed out) full-width in the footer.

At 390px the bottom navigation holds up to five entries (Navigator, Marketplace, account, My museums, language), and labels truncate ("Marke…", "My m…") while the language `Select` crowds the trailing edge. This is a known defect of the current row, not a pattern to copy; any new entry must solve it first.

### Named Rules

**The Thumb-Reach Rule.** On a focused task page, the next step lives full-width in the footer, inside reach of a standing visitor's thumb, and nowhere else. Content scrolls; the forward action does not.

**The Overlay Opt-In Rule.** Floating controls over a map or canvas sit in a transparent, non-interactive overlay container; each control re-enables pointer events on itself. Never give the container pointer events back.

## Elevation & Depth

Depth is functional: restrained shadows distinguish floating controls and overlays from their background. Mantine's shadow vocabulary does the work, and the tour card is the one place where depth is allowed to be decorative.

- **Toolbar** (`var(--mantine-shadow-xs)` plus a 1px `--mantine-color-default-border`): separates the editor creation and services toolbars from the canvas.
- **Menu** (`shadow="md"`): the bottom navigation's "My museums" dropdown, which opens upward with an arrow, and the guidance-settings `Popover` (`top-end`, with an arrow), which opens above its icon.
- **Small surface** (`var(--mantine-shadow-sm)`): the inherited step used by plain `Card shadow="sm"` surfaces such as search results and the QR paper, and by the GPS simulator pad over the map.
- **Notifications:** Mantine notifications at `top-center` carry everything transient during navigation: nearby suggestions, the assistant's reply as a caption, and assistant errors. Top-center keeps them clear of both the bottom controls and the navigation bar.
- **Tour card** (`var(--mantine-shadow-lg)`): supports the layered tour treatment.

The animated search is a deliberate exception rather than an elevation step: a `BorderAnimate` wrapper runs a four-second border cycle around the input, and the navigator wraps the whole search in `Reflection` with a subtle ripple and a soft shadow (`shadowOpacity 0.2`, `shadowBlur 5.51`, `shadowSize 29`). Treat those as part of the discovery accent, not as a reusable depth token.

### Named Rules

**The Functional-First Rule.** Shadows appear because something floats or overlays. Marketing-style ambient shadow on ordinary content is not part of the incumbent vocabulary.

## Shapes

Mantine provides the main radius scale: `xs` through `xl` in frontmatter, with `sm` as its ordinary default. Rounded images and cards coexist with pill-like search and badge controls: the global search is `radius="xl"` (32px), the tour tag badge and difficulty chips are fully round, and the newest circular controls (`Scan` pill, service icons, the microphone button, the assistant orb) use `rounded-full`, and the spotlight's command pills, the modals' reading and "Tell me more" pills, the museum switch, and the settings and wheelchair icons use `radius="xl"`.

The editor's `--radius` is separately 0.625rem, with derived multipliers in the global stylesheet. Do not mistake this for a replacement of Mantine's radius scale. Border-based grouping and image cropping remain useful even where shadows are present: content cards use a 2px teal outline, and content/object modals crop images to a `radius="md"` frame. Border style can carry state: a service card that still needs a map position has a dashed yellow.6 border, and it always comes with a "Not placed" badge.

### Named Rules

**The Inherit-Radius Rule.** Nested surfaces take their radius from the parent (`rounded-[inherit]`) rather than inventing a new value; this is what keeps the `BorderAnimate` wrapper flush with the input it decorates.

## Components

Each component below leads with its character, then shape, color assignment, states, and any distinctive behavior. Everything here is observed prototype behavior.

### Buttons

- **Shape:** Mantine `sm` radius except deliberate full-round pills.
- **Primary:** filled navigation blue; the `Scan` action is a `size="compact-xl"` dark full-round pill with a trailing icon, so it reads as a tool rather than a form action.
- **Hover / Focus:** inherited Mantine states; the start-tour action additionally scales on hover.
- **Supporting:** `variant="default"` for a calm second action ("Resume tour route", Cancel in form rows), `variant="light"` for service icons and owner shortcuts, `variant="white"` for floating icons over the map, `subtle` for an inactive bottom-nav entry.
- **Acquisition:** paid orange, filled, `autoContrast`, with a trailing `ShoppingBag` ("Unlock for €…"). On a tour page it sits beside the blue.8 navigate button. Navigation is always offered; locked contents just stay locked along the way. The orange marks the _entry_ to buying; inside the unlock modal the committing "Buy all for €…" is the ordinary filled primary (blue, leading `ShoppingBag`, `loading` while Stripe Checkout is created), above a `default` "Replace the paid contents". Signed-out visitors get "Sign in to buy" (`LogIn`) in its place.
- **Destructive:** `subtle` red with a leading `Trash2`, behind a centered Mantine confirm modal whose confirm button is red. Row-level removal uses a red `subtle` `ActionIcon`.
- **Form rows (`FormActions`):** right-aligned `xs` group with a `default` Cancel followed by a filled Save that shows `loading` while saving. Feedback goes through Mantine notifications: green "Saved", or red with the server's message.
- **Server-rendered links:** `LinkButton` puts a Mantine Button on a Next `Link`, so server pages can render actions without passing functions across the client boundary.
- **Icon-only:** canvas and floating actions must carry both a tooltip (`title`) and an accessible label (`aria-label`). Toggle-style icons expose `aria-pressed`.

### Chips / Badges

- **Difficulty:** label + icon + semantic color (see The Triplet Rule). Compact contexts may hide the label (`withLabel={false}`) while keeping the icon, or keep the label with a compact duration chip beside it in a stepper description.
- **Duration:** a clock icon with a compact minute label (`12'`).
- **Category pills:** white surfaces with colored or gradient text — `Badge variant="white"` with a teal border on contents, `variant="gradient"` for section labels. Category appearance and difficulty meaning are separate concerns.
- **Locked price:** a `light` orange badge with a leading `Lock` and the formatted price, placed next to a locked content's title.
- **Status:** small `light` badges such as yellow `xs` "Not placed". Each one names its state in words.
- **Service avatars:** round Mantine `Avatar`s in the marker color with the marker icon. The museum page derives them from the services that are actually present in its map.

### Cards / Containers

- **Search-result card:** the recurring calm container — `Card shadow="sm" padding="sm" radius="md" withBorder` with a 160px cover image, a one-line title and a two-line dimmed description. It lives in `SearchResultCard` (`src/components/mantine/SearchResultCard.tsx`), and `SearchResultsGrid` owns the 1/2/3-column grid and the dimmed empty line. The tours, objects and contents result lists all render through it; `variant="content"` adds the teal content outline. Build new listings on it instead of re-declaring the card.
- **Placeholder image:** every missing thumbnail falls back to `PLACEHOLDER_IMAGE` (`src/lib/placeholder-image.ts`). Don't inline the URL.
- **Content cards:** teal `border-2` outlines with square-ish image areas and `rounded-xl` framing.
- **Tour cards:** purple/orange framing, grape borders, stacked selection, and explicit previous/next controls.
- **Object detail images:** a 16:9 area with `md` radius.
- **Staff and service rows:** `Paper`/`Card` with `withBorder`, `p="sm"` and `radius="md"`. The name sits in weight 500 above a dimmed `xs` secondary line (`@username`, status), and the actions are grouped at the trailing edge. Rows the viewer can't manage show their role as plain text instead of a disabled control.
- **Locked notice:** an orange `Alert` with a `Lock` icon takes the place of a paid content's body. It replaces the text instead of leaving an empty gap.
- Reuse these distinctions where helpful, without copying prototype inconsistencies as requirements.

### Inputs / Fields

- **Ordinary forms:** Mantine `TextInput` and `Textarea` with labels, descriptions, required indicators, errors, and disabled states as documented in Storybook.
- **Global search (the exception):** a large rounded input (`size="lg"`, `radius="xl"`) with a search icon, a hardcoded `1px solid purple` border, and an animated `BorderAnimate` surround on a four-second cycle. In the navigator it is additionally wrapped in `Reflection`. Its incumbent hardcoded copy and exact decoration remain eligible for refinement.
- **Combobox results:** dropdown options for tours are wrapped in `BorderAnimate variant="draw"`; the input keeps a visible focus treatment for keyboard users.
- **Rich text:** Mantine's TipTap `RichTextEditor` inside an `Input.Wrapper`, so it gets the same label, description and error as every other field. The toolbar is limited to formats that round-trip through Payload's Lexical storage: bold, italic, H2/H3, lists, quote, link, undo/redo. Every control has a translated label.
- **Dictation:** a field that accepts speech (the planner's Interests) carries a round `ActionIcon` in its `rightSection`: `subtle` `Mic` at rest, filled red `Square` while recording, a 14px `Loader` while transcribing. The words land in the field for the visitor to edit; nothing runs on its own. Its `aria-label` names the next action ("Dictate", "Stop dictating").
- **Domain inputs:** `PriceInput` is a euro `NumberInput` (`€ ` prefix, two fixed decimals, where empty means free). `ObjectPicker` is a searchable, clearable `Select` filtered on the server. Both carry a plain-language `description` that explains the rule behind the field.

### Navigation

- **ArtaroundTabs:** a moving 2px blue bottom indicator (`FloatingIndicator`) over `grow`-distributed tabs, optional icons, optional panels, and a `none` variant. Selected state is the underline, not a filled block.
- **Bottom app navigation:** `grow` entries with an icon above an `xs` label. Navigator is green, Marketplace red, and the account entry blue. Signed out, it is a `LogIn` icon over "Sign in", linking to `/login?next=` the current page. Signed in, it becomes a 20px `Avatar` (photo, or initials from the name) over the display name clamped to one line (`maw="10ch"`), opening an upward `Menu` (200px) with "Profile" (`User`) and a red "Sign out" (`LogOut`). The visible name is the button's accessible name (the avatar is `aria-hidden`). Until the client session has loaded, the tabs layout's server session supplies the id, name and avatar, so the entry shows the real visitor from the first paint. The account entry is never "active": profiles live outside the tabs. When the visitor holds a museum role, a grape "My museums" entry opens an upward menu that lists each museum with its role icon and dimmed role label (`Landmark` director, `Palette` curator, `BadgeCheck` verified creator). Entries are `light` when active and `subtle` otherwise, the active one sets `aria-current="page"`, and the language switcher closes the row.
- **Tour progress:** a horizontally scrolling Mantine `Stepper` (`size="xs"`, `iconSize={24}`) whose active stop scrolls itself into view on change; clicking a stop opens that content without moving the tour cursor. When the museum has an entrance, an entrance step leads the stepper. A tour with a quiz ends with one more step, "Quiz", marked by a checklist icon; it is visible from the start and selectable at any time. Once the tour is complete, the directions strip's "Tour completed" state carries a `compact-sm` primary "Take the quiz" at its end.
- **Service routing buttons:** during tour navigation, there is one marker-colored icon button per service type present (`light` at rest, `filled` while it is the route target), plus a red exit button. Each one routes to the closest instance of its type.
- **Tour content modals:** open in contextual Mantine modals while the map stays mounted; closing returns to the current tour context. Their reading options (`?level=`, `?minutes=`, `?audience=`) and "Tell me more" angle (`?more=`) are URL state too, so a shared link opens the same text. Shareable modal URLs and explicit visitor position are behavioral requirements in PRODUCT.md and `docs/tour-navigation.md`; visual refinements must preserve them.
- **Group tours:** in a group, the host's URL is the group's URL. Guests follow the step, position, destination and open modal; their language, wheelchair route and reading options stay theirs (see `docs/group-tours.md`).
- **Spotlight:** the map's search affordance is a compound Mantine Spotlight over the museum-scoped catalog and every navigation command, deliberately separate from the tour's ordered progress. An empty query shows command pills instead of an empty list (see Command pills).

### Quiz answers and feedback

The quiz's one bespoke control: calm, large, and honest about the result.

- **Answer option:** a full-width `Button size="lg"` (`answer-option`): `default` variant, `md` radius, at least 56px tall, label left-aligned and wrapping (`white-space: normal`, line-height 1.35, weight 500). Four per question, stacked with `sm` gaps inside a labelled group.
- **States:** idle → the chosen option shows Mantine's inline loader while the others stop responding → graded. The right option turns `light` green with ✓ + "Right answer"; a wrong pick turns `light` red with ✗ + "Your answer"; the rest stay default with dimmed text. Graded options are `aria-disabled`, never grayed out, so the comparison stays readable.
- **Feedback panel:** a bordered `md`-radius `Paper` below the options: a bold verdict in `feedback-correct` / `feedback-wrong` ("Correct!" / "Not quite."), the explanation as body text, and subtle `compact-sm` "Read the content again" buttons with a book icon. The panel sits in a polite live region; a wrong answer also announces the right one to screen readers.
- **Quiz progress:** a `sm` `Progress` whose filled section carries the tour gradient (`from-purple-700 to-orange-400`), the only place the gradient appears in the quiz.
- **Intro:** tour title as the `h2`-sized heading, one dimmed line for length ("Final quiz · 5 questions · about 3 min"), an orange `Alert` with a warning icon when stops are still ahead, then stacked actions: primary start/resume, default "Start over", subtle "Back to the tour".
- **Read again:** contents open in a right-side `Drawer` (`size="lg"`), never by navigating away from the quiz or results.

### Quiz results

- **Score:** a 160px `RingProgress` (14px stroke, round caps) whose single section is the score percentage: green from 50%, orange below. The score in the ring's center is the ring's label, not decoration beside it. A one-line verdict follows.
- **Comparison:** a plain sentence states the takeaway ("You did better than 62% of visitors"); a 180px `@mantine/charts` `BarChart` below shows the shape: no y-axis, grid, tick lines or tooltip, value labels on bars, own band in `chart-highlight` and named "(you)" on the axis. Below the statistics threshold, a dimmed sentence replaces both.
- **Review:** numbered prompt (dimmed tabular number), ✓/✗ lines for your answer and the right answer, dimmed explanation, an `xs` gray `Progress` with "n% of visitors got this right", and a read-again or "Stop not visited yet: open it" action. Items are separated by `Divider`s.
- **Closing actions:** the plugin's star rating (`LfrsRating`), then Share and Retake as an evenly split pair of `default` buttons, and Back to the navigator in the footer.

**The Chart-Follows-Sentence Rule.** A chart never carries the takeaway alone. The sentence above it states the finding; the chart adds the distribution, and its container exposes a text summary for screen readers.

### Inline editing (`src/components/editing/`)

Editing for allowed viewers happens on the visitor's own pages instead of a separate admin skin. An `EditableSection` puts an `h4`-sized title on the left and a `subtle` pencil `ActionIcon` on the right. The pencil turns into an `X` with `aria-pressed` while editing, and the section's read view is swapped in place for its form. Simple metadata is edited this way; larger structures (new contents, tours, staff) get dedicated pages built from the same Mantine fields. The server decides who sees the controls, so the UI doesn't show disabled affordances to viewers who can't use them.

**The Edit-In-Place Rule.** Editing reuses the visitor's typography, spacing and Mantine controls. Don't introduce the neutral shadcn/editor layer or a dashboard look to visitor-facing pages because a form appeared on them.

### Museum services toolbar and panel (staff map editor)

This is the right-hand mirror of the creation toolbar: a vertical `Paper` with a `role="group"` label holding 44px `ActionIcon`s in marker colors. Service icons are `default` at rest and `light` with `aria-pressed` when they filter the panel; a `Divider` separates them from the entrance/exit placement tools. The sidebar panel lists service cards with the unplaced ones first. Each card has a round marker-colored action, filled when the service still needs placing and light with `MapPinPlus` once placed, an opening-hours field, and a subtle red remove.

### Directions strip (`DirectionsBar`)

The route one sentence at a time, sized for a glance while walking. A dimmed `xs` meta line ("Step 2 of 4 · about 6 m") sits above the current direction in `sm` weight 600, clamped to two lines. Subtle gray chevron `ActionIcon`s on either side step through the route; at either end they are disabled, not hidden. Tapping the sentence opens a Mantine `Modal` titled "Directions to …" with the full route as a `Timeline` (22px bullets, 2px line): a `Footprints` bullet per step, `MapPinCheck` for the arrival, the active item in weight 700, and every item clickable to jump there. Without a route, the same 48px-tall slot shows an icon (`Navigation`, `MapPinOff`, `MapPinCheck`) with a bold status line and an optional dimmed hint, in a polite live region.

**The One Strip Rule.** Route status and the current direction share one slot in the navigation bar. A new route state becomes a state of the strip, never another banner in the footer.

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

- **Reading options**, above the body: "Simpler" (`Feather`), "Shorter" (`Clock`), "For children" (`Baby`). At rest they are `default`, chosen ones `filled`, each with `aria-pressed`, in a `role="group"` labelled "Reading options". A pill that cannot apply (already easiest, already one minute) is disabled rather than hidden. Once one is on, a `subtle` gray "Original" (`RotateCcw`) appears to undo them all. The chosen version takes the body's place under the same title.
- **Tell me more**, after the body: "Tell me more" (`BookOpen`), "Curiosities" (`Lightbulb`), "Its story" (`History`). They are `light` at rest and `filled` when chosen, the same family as the Spotlight's command pills. Object modals get this row too; locked paid contents get neither row.

The text itself is plain paragraphs in the body's own typography, `margin-bottom: sm` between them, with `**bold**` and links as the only marks. A link opens the linked object or content in the tour's modal and keeps the visitor's position; once the text is complete, the linked entities repeat below it as 48px `md`-radius thumbnails over a two-line `xs` weight-600 title (72px wide). Before the first paragraph arrives, three 10px `Skeleton` lines (the last at 70%) hold its place; a failure is one dimmed `sm` line that says to try again in a minute. The container is a polite live region with `aria-busy` while text arrives.

**The Same-Voice Rule.** Generated text wears the museum's own voice: no chat bubbles, avatars, typing cursor, word-by-word streaming, sparkle icon, "AI" wording or "generated" badge. It arrives one whole paragraph at a time, and only the metadata (`generation` groups in Payload) tells it apart from authored text.

### Plan my visit (form and preview)

An ordinary Mantine form, never a prompt: a searchable clearable `Select` for the museum (hidden in museum mode), two full-width `SegmentedControl`s labelled by a `sm` weight-500 question ("How much time do you have?" 30 min to 2 h, and "Have you been here before?"), a `NumberInput` for adults beside a `TagsInput` of children's ages, an autosizing Interests `Textarea` with a description, a placeholder example and dictation, and a wheelchair `Checkbox`. Errors appear as one orange `Alert` above the submit button, which shows `loading` while the tour is planned.

The preview leads with the tour's `h1` title and dimmed description, then two `light` badges (`Clock` "About N minutes" in blue, "N stops" in gray), then the stops as the same `Timeline` as the directions modal (22px bullets, 2px line, `Footprints` per stop, `MapPinCheck` for the last), each with a dimmed `xs` line "object · room · N min read".

### Museum switch

A `light` `compact-sm` `radius="xl"` button showing `Globe` "All museums" in global mode or `Landmark` plus the museum's name (truncated) in museum mode. It opens a "Change museum" modal: a search `TextInput` with a `Search` icon, autofocused. Typing lists matching museums as rows (name in `sm` weight 600 over the city in dimmed `xs`); an empty search shows a centered dimmed "or" above a `default` "Import a config file" `FileButton` (`FileUp`), plus a `subtle` "Back to all museums" (`Globe`) when a museum is locked. Problems show as one orange `Alert` under the list.

### Group tours (waiting room, group pill, locked modal, quiz board)

Same Operate restraint as the planner: one centered `Container size="xs"` column, Mantine defaults, no new color.

- **Join and start:** "Start with a group" is a `default` button with `UsersRound` beside "Start Tour"; it and the join page ask one thing, "Your name" (`@mantine/form` with the API's zod schema), remembered on the device. "Joining a group? Enter its code" is a `sm` `PinInput` of six alphanumeric boxes plus a filled "Join", on the navigator home and the tour's start page. The "Start with a group" modal opens with one dimmed `sm` line on what leading means, then the name field and the `Checkbox` "See everyone's quiz results" (with a description; off by default), then a full-width "Open the group". The join page shows the tour heading, "{host} invited you to visit this tour together.", a dimmed `sm` notice "{host} will see your score…" only when the host chose to see results, an orange light `Alert` when the visitor is already in another group, then the name form with "Join the group".
- **Waiting room:** the tour's 64px `md`-radius thumbnail beside its `h2`-sized title; then "Group code" (dimmed `sm`) over the code in **monospace 40px weight 700, 0.12em tracking**, the one monospace use, because the code is read aloud and copied letter by letter. The host gets a `Group grow` pair of `default` buttons ("Share link", "Show QR code" opening a centered QR modal), the member list between dividers, a `md` filled "Start the tour" (`Play`) and a `subtle` red "End the group tour". Guests see a dots `Loader` with "Waiting for {host} to start the tour" (or "{host} is not connected right now") and a `subtle` gray "Leave the group". Before connecting, an `xs` `Loader` and "Connecting to the group" stand in for the member list. Once started, the host's button reads "Back to the tour".
- **Group ended:** an unknown, mistyped or ended code gets a centered `h2`-sized "This group has ended", a dimmed line ("Ask for a new code, or visit the tour on your own.") and a `default` "Back to the navigator". Every device in an ended group gets a Mantine notification "The group tour has ended".
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
- **Profile sign out:** a `default` `xs` button with a leading `LogOut` among the profile's account actions; it shows `loading` and returns to the navigator.

### Checkout (Stripe sandbox)

- **Landing pages:** see Layout → Checkout landing pages. Success never trusts the redirect: it states what the purchases collection says. "Payment received" when the bought tour or content is owned, "Payment not confirmed yet" (it unlocks when Stripe confirms) otherwise, "Sign in to see your purchase" for a signed-out visitor. A Stripe reference, when present, is a dimmed `xs` line.
- **Checkout errors** stay where the action was taken: red `sm` text with `role="alert"` under the button that failed (the modal's "Buy all", `BuyButton`), never a page change.
- **Sandbox shop (`/[lng]/stripe-test`)** is a developer harness, not a product pattern.

### Motion and small playful exceptions

- **Global search:** a four-second `BorderAnimate` cycle, plus `Reflection` ripple.
- **Tour carousel:** stacked selection with a 500ms transition; a hover scale on the start action.
- **Navigator hero:** `TypeWriterText` cycles one word (`creators` / `curators` / `museums`) with per-word color (`red.8` / `green.8` / `blue.8`) and a gray fallback.
- **Tabs:** the active indicator moves rather than jumping.
- **Added paragraphs:** each "Tell me more" or version paragraph settles in once, 420ms `cubic-bezier(0.16, 1, 0.3, 1)`, from 0 opacity and 4px lower; off under reduced motion. One entrance per paragraph, never per word.
- **Assistant orb:** the only continuously animated element during navigation, and only while the assistant is on. Its motion encodes state (see Assistant orb) and stops under reduced motion.

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
- **Do** source every museum-marker color and icon from `markers.ts` (see The Single Marker Table Rule).
- **Do** pair paid orange with a `Lock`/`ShoppingBag` icon and a price or label, and keep navigation available beside any unlock action.
- **Do** give every assistant capability a non-voice path: a command pill, an overlay control, or the directions modal.
- **Do** show route states inside the directions strip, and transient guidance as top-center notifications.
- **Do** offer generated help as named buttons, form fields and voice commands, and keep its state in the URL.
- **Do** improve prototype inconsistencies, accessibility, and responsive behavior while preserving the intended feel.
- **Do** put a focused task's single forward action full-width in the 64px footer, with the content inside `AppShellMain` (see The Thumb-Reach Rule).
- **Do** grade answers with color + icon + word, and keep graded options readable rather than disabled-gray.
- **Do** state a chart's finding in a sentence first, and color only the viewer's own series (see The Highlight-One Rule).
- **Do** build sign-in, sign-up and checkout outcomes from the existing planner column and focused-task patterns rather than new chrome.
- **Do** show a checkout failure as text under the control that started it, and return the buyer to where the purchase began.

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

<!-- Extraction sources: src/theme.ts (empty createTheme); src/app/[lng]/(frontend)/globals.css and layout.tsx; src/app/[lng]/(frontend)/(tabs)/{layout.tsx,NavBar.tsx,navigator/NavigatorPage.tsx}; tour/[id]/navigation/[stepId]/{TourNavigation.tsx,TourProgress.tsx}; src/components/mantine/{ArtaroundTabs,DifficultyBadge,DurationBadge,ArtAroundGlobalSearch,ToursCarousel,ContentsCarousel,ObjectsCarousel,TypeWriterText}.tsx; src/components/pascal/{museum-creation-toolbar,object-catalog}.module.css; src/components/agents-ui/agent-audio-visualizer-aura.tsx; src/components/ui/{shine-border,orbiting-circles}.tsx; Storybook docs for ArtaroundTabs, DifficultyBadge, ToursCarousel, ArtAroundGlobalSearch; package.json (Mantine 9.6.3, Tailwind v4, shadcn). Rendered navigator, tour carousel, and dark tabs were inspected in the prior pass; this refresh verified claims against source. 2026-10-19 merge: added src/components/editing/*, src/components/pascal/{MuseumServicesToolbar,MuseumServicesPanel}.tsx and their module CSS, src/lib/pascal/museum-plugin/markers.ts, (tabs)/NavBar.tsx (account + My museums), TourPage paid/locked treatment, ContentDetailsModal locked notice, MuseumPage owner actions and service avatars, TourProgress entrance step. 2026-10-19 extract: SearchResultCard/SearchResultsGrid and PLACEHOLDER_IMAGE consolidated from the three *SearchResults lists and five inline placeholder URLs. Tokens in theme.ts/globals.css were unchanged (only the @mantine/tiptap stylesheet import was added). 2026-10-19 merge (guidance, d8d9584): src/components/assistant/{AssistantOrb,NavigationAssistant,CrystalizedBall}.tsx; tour/[id]/navigation/[stepId]/{TourNavigation,DirectionsBar,NavigationSpotlight,GuidanceSettings,GpsSimulator,MuseumMap}.tsx and use-nearby-suggestions.tsx; src/components/mantine/LockedPriceBadge.tsx. 2026-10-20 merge (expansions, planned tours, museum mode): src/components/expansion/{ContentExpansion,ContentVersion,ExpansionText}.tsx and ContentExpansion.module.css; tour/plan/PlanVisitPage.tsx; src/components/mantine/MuseumSwitch.tsx; (tabs)/{layout.tsx,navigator/NavigatorPage.tsx}; rendered at 390px and 1280px through tests/e2e/content-expansion.e2e.spec.ts screenshots. 2026-10-20 merge (group tours): src/components/group/*, room/[code]/GroupRoomPage.tsx, tour/[id]/quiz/GroupQuizBoard.tsx, navigation/[stepId]/NavigationModal.tsx; rendered at 390px through tests/e2e/group-tour.e2e.spec.ts screenshots. 2026-10-20 merge (quiz, PR #1): tour/[id]/quiz/{TourQuiz,QuizContentDrawer}.tsx, quiz/result/[token]/QuizResult.tsx (+ stories), navigation/[stepId]/{TourProgress,TourNavigation,DirectionsBar}.tsx; @mantine/charts 9.6.3. 2026-10-20 merge (login branch): src/app/[lng]/(frontend)/(auth)/{layout,login/page,signup/page}.tsx, src/components/auth/{LoginForm,SignupForm,SignOutButton}.tsx, (tabs)/NavBar.tsx (avatar account menu), tour/[id]/TourPage.tsx (PurchaseModal checkout), checkout/{success,cancel}/page.tsx, stripe-test/page.tsx, src/components/payments/BuyButton.tsx; rendered at 390px and 1280px with a seeded local database. Then conformed to this file: auth screens moved to the planner column (no card), checkout pages to focused task pages, account entry named by its visible name. -->
