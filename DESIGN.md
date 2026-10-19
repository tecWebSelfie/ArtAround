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
4. **Assistance layer** — the voice assistant's look. Its shipped identity is the ember **assistant orb** (React Bits `CrystalizedBall`, `src/components/assistant/`), which sits in the tour-navigation bar. The older LiveKit `agents-ui` shader visualizers (cyan aura) remain in the code behind the navigator's microphone. Either way this namespace has exactly one sanctioned expression per screen (see Components → Assistant orb), not a global motif.

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
- **Grape** (`grape`, Mantine grape.6): the tour de-emphasis/control accent. Tour card borders and the carousel's previous/next controls currently use `border-mantine-grape-6`. It also marks the staff side of the bottom navigation: the "My museums" entry is grape, which keeps it apart from the visitor-facing green Navigator and red Marketplace.
- **Paid orange** (`paid-orange`, Mantine orange.6): the color of acquisition and of locked content. It appears on the "Unlock for €…" button, the tour's "Edit/Customize tour" action, the `Lock` price badge on locked tour contents, and the orange `Alert` that replaces the body of a paid content the viewer isn't entitled to. It always comes with a `Lock`, `ShoppingBag` or `Pencil` icon and a label.
- **Content teal** (`content-teal`, Mantine teal.6): the content identity. Content outlines use Tailwind `border-teal-600` (`border-2`), and content headings use a Mantine `teal → cyan` gradient. Preserve the distinction when tracing styles; do not silently substitute one value for another.
- **Assistant ember** (`assistant-ember`): the orb's particle color, from the user-supplied ember reference. It lives inside the orb's WebGL canvas and nowhere else: no button, badge or border takes it. By hue it is close to paid orange, and the two never get confused, because the orb carries no text while an acquisition control always carries a `Lock`/`ShoppingBag` icon and a price.
- **Voice aura** (`voice-aura`): the default accent of the legacy `agents-ui` shader visualizer (`#1FD5F9`), still behind the navigator's LiveKit microphone. It is evidence of that older layer, not a palette commitment. New assistance UI uses the ember orb.

### Tertiary: museum markers

A small semantic set that comes from one source: `SERVICE_META` / `EXIT_ENTRANCE_META` in `src/lib/pascal/museum-plugin/markers.ts`. Each marker kind carries an icon, a Mantine color name for badges, avatars and action icons, and a matching hex for three.js materials. The visitor's service buttons, the museum page's service avatars, the staff services toolbar and panel, and the 3D map pins all read this table, so a service looks the same in 2D and in 3D.

- **Toilets / entrance:** navigation blue (`Toilet`, `LogIn`).
- **Food:** easy green (`Utensils`).
- **Info point:** paid orange (`Info`). It shares the hue with acquisition, and only the icon tells them apart, which is why the icon is mandatory.
- **Shop:** marker red (`marker-red`, red.6, `ShoppingBag`).
- **Exit:** exit red (`exit-red`, red.4, `LogOut`). It is a lighter red than the shop, so the two stay distinguishable on the map.

**The Single Marker Table Rule.** Never pick a marker color locally. Add or change a marker kind in `markers.ts` so that the 2D chrome and the 3D material stay in sync.

### Neutral

- **Light surface / subtle surface** (`surface-light`, `surface-subtle`): white and Mantine gray.0. Objects use relatively plain image-led presentation so the museum image or object can lead. The tour-navigation bars, the GPS pad and the settings popover are plain white Mantine surfaces too, so the map stays the loudest thing on screen.
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

**Tour navigation** is a full-viewport composition under the shared shell: an `rounded-b-xl` header stacks the tour title, a linear `Progress` bar between start/finish icons, and a horizontally scrolling `Stepper` of tour stops; the main area is `100dvh` with `overflow-hidden` and holds the map; a `rounded-t-md` footer is the **navigation bar**: about four fifths of it (`flex-[4]`) is the directions strip, and the remaining fifth right-aligns the assistant orb. Route states (finding a route, no route, tour complete, no position yet) are states of that strip, not separate footer messages. "Open next stop" and "Resume tour route" live in a centered button pair that floats just above the map's control row. Controls that must float above the canvas live inside an `Overlay backgroundOpacity={0}` with `pointerEvents: 'none'`, and each interactive child opts back in with `pointerEvents: 'auto'` — a pattern worth preserving, since it keeps the map draggable underneath.

Inside that overlay the visitor's map controls stack from the bottom: the next-stop/resume pair, then one row holding the vertical service-and-exit `ActionIconGroup`, the wheelchair toggle, the `Scan` pill, the search icon and the guidance-settings icon. When simulated GPS is on, its D-pad floats top-left below the header (`pt-36`), clear of the stepper.

The museum map supports floating task controls. The staff creation toolbar is positioned at top 4.5rem and left 0.75rem, and the museum services toolbar mirrors it at top 4.5rem and right 0.75rem. Both are vertical, have bounded height (`calc(100% - 10rem)` on the services side) and scroll vertically. The object catalog and services panel keep a scrollable body (services rows cap at 60vh) and wrap their actions.

Detail pages for museums, objects, contents and tours stack read-only sections. When the viewer may edit, owner actions appear inline as a compact row of `size="xs"` `light` link buttons (map, tour, new content), with `subtle` used for lower-priority staff management. Editing never moves to a separate admin chrome; it happens where the content is read. These measurements describe current layouts; they should be refined when content, touch use, or viewport constraints expose defects.

### Named Rules

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

Mantine provides the main radius scale: `xs` through `xl` in frontmatter, with `sm` as its ordinary default. Rounded images and cards coexist with pill-like search and badge controls: the global search is `radius="xl"` (32px), the tour tag badge and difficulty chips are fully round, and the newest circular controls (`Scan` pill, service icons, the microphone button, the assistant orb) use `rounded-full`, and the spotlight's command pills and the settings and wheelchair icons use `radius="xl"`.

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
- **Acquisition:** paid orange, filled, `autoContrast`, with a trailing `ShoppingBag` ("Unlock for €…"). On a tour page it sits beside the blue.8 navigate button. Navigation is always offered; locked contents just stay locked along the way.
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
- **Domain inputs:** `PriceInput` is a euro `NumberInput` (`€ ` prefix, two fixed decimals, where empty means free). `ObjectPicker` is a searchable, clearable `Select` filtered on the server. Both carry a plain-language `description` that explains the rule behind the field.

### Navigation

- **ArtaroundTabs:** a moving 2px blue bottom indicator (`FloatingIndicator`) over `grow`-distributed tabs, optional icons, optional panels, and a `none` variant. Selected state is the underline, not a filled block.
- **Bottom app navigation:** `grow` entries with an icon above an `xs` label. Navigator is green, Marketplace red, and Account/Sign in blue. When the visitor holds a museum role, a grape "My museums" entry opens an upward menu that lists each museum with its role icon and dimmed role label (`Landmark` director, `Palette` curator, `BadgeCheck` verified creator). Entries are `light` when active and `subtle` otherwise, the active one sets `aria-current="page"`, and the language switcher closes the row.
- **Tour progress:** a horizontally scrolling Mantine `Stepper` (`size="xs"`, `iconSize={24}`) whose active stop scrolls itself into view on change; clicking a stop opens that content without moving the tour cursor. When the museum has an entrance, an entrance step leads the stepper.
- **Service routing buttons:** during tour navigation, there is one marker-colored icon button per service type present (`light` at rest, `filled` while it is the route target), plus a red exit button. Each one routes to the closest instance of its type.
- **Tour content modals:** open in contextual Mantine modals while the map stays mounted; closing returns to the current tour context. Shareable modal URLs and explicit visitor position are behavioral requirements in PRODUCT.md and `docs/tour-navigation.md`; visual refinements must preserve them.
- **Spotlight:** the map's search affordance is a compound Mantine Spotlight over the museum-scoped catalog and every navigation command, deliberately separate from the tour's ordered progress. An empty query shows command pills instead of an empty list (see Command pills).

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

### Motion and small playful exceptions

- **Global search:** a four-second `BorderAnimate` cycle, plus `Reflection` ripple.
- **Tour carousel:** stacked selection with a 500ms transition; a hover scale on the start action.
- **Navigator hero:** `TypeWriterText` cycles one word (`creators` / `curators` / `museums`) with per-word color (`red.8` / `green.8` / `blue.8`) and a gray fallback.
- **Tabs:** the active indicator moves rather than jumping.
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
- **Do** improve prototype inconsistencies, accessibility, and responsive behavior while preserving the intended feel.

### Don't:

- **Don't** treat every prototype measurement, gradient, or animation in this file as an immutable brand requirement.
- **Don't** turn ordinary forms and navigation into continuously animated showcases.
- **Don't** confuse Mantine tokens with the separate Pascal/editor CSS-token layer.
- **Don't** promote the orb's ember or the voice aura into a global motif, background, accent color, or loading treatment.
- **Don't** draw the GPS estimate like the confirmed position, or add a compass: the map is always north-up.
- **Don't** present planned product capabilities or unverified accessibility compliance as implemented design evidence.
- **Don't** treat the unused `shine-border`/`orbiting-circles` primitives, or the hardcoded search copy, as settled design.
- **Don't** show disabled edit or delete controls to viewers who lack permission; omit them (see The Edit-In-Place Rule).

<!-- Extraction sources: src/theme.ts (empty createTheme); src/app/[lng]/(frontend)/globals.css and layout.tsx; src/app/[lng]/(frontend)/(tabs)/{layout.tsx,NavBar.tsx,navigator/NavigatorPage.tsx}; tour/[id]/navigation/[stepId]/{TourNavigation.tsx,TourProgress.tsx}; src/components/mantine/{ArtaroundTabs,DifficultyBadge,DurationBadge,ArtAroundGlobalSearch,ToursCarousel,ContentsCarousel,ObjectsCarousel,TypeWriterText}.tsx; src/components/pascal/{museum-creation-toolbar,object-catalog}.module.css; src/components/agents-ui/agent-audio-visualizer-aura.tsx; src/components/ui/{shine-border,orbiting-circles}.tsx; Storybook docs for ArtaroundTabs, DifficultyBadge, ToursCarousel, ArtAroundGlobalSearch; package.json (Mantine 9.6.3, Tailwind v4, shadcn). Rendered navigator, tour carousel, and dark tabs were inspected in the prior pass; this refresh verified claims against source. 2026-10-19 merge: added src/components/editing/*, src/components/pascal/{MuseumServicesToolbar,MuseumServicesPanel}.tsx and their module CSS, src/lib/pascal/museum-plugin/markers.ts, (tabs)/NavBar.tsx (account + My museums), TourPage paid/locked treatment, ContentDetailsModal locked notice, MuseumPage owner actions and service avatars, TourProgress entrance step. 2026-10-19 extract: SearchResultCard/SearchResultsGrid and PLACEHOLDER_IMAGE consolidated from the three *SearchResults lists and five inline placeholder URLs. Tokens in theme.ts/globals.css were unchanged (only the @mantine/tiptap stylesheet import was added). 2026-10-19 merge (guidance, d8d9584): src/components/assistant/{AssistantOrb,NavigationAssistant,CrystalizedBall}.tsx; tour/[id]/navigation/[stepId]/{TourNavigation,DirectionsBar,NavigationSpotlight,GuidanceSettings,GpsSimulator,MuseumMap}.tsx and use-nearby-suggestions.tsx; src/components/mantine/LockedPriceBadge.tsx. -->
