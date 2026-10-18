---
name: ArtAround
description: An approachable Mantine interface with small playful museum-discovery accents.
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
  button-primary-hover:
    backgroundColor: '{colors.navigation-blue-hover}'
  search:
    rounded: '{rounded.xl}'
  tab-active:
    textColor: '{colors.navigation-blue}'
  floating-toolbar:
    rounded: '{rounded.md}'
    padding: '0.375rem'
---

# Design System: ArtAround

<!-- Prototype-derived visual guidance confirmed with the user. This records the intended feel, not a claim that every incumbent detail is polished or accessible. -->

## Overview

**Creative North Star: "The Adaptable Museum Companion"**

ArtAround should feel familiar and approachable to casual museum visitors as well as staff. Mantine is the main design system: recognizable controls, clear labels, system typography, neutral surfaces, and straightforward task flows provide the foundation. The existing UI is the main suggestion for the product's feel, but remains a prototype rather than a finished specification.

Playfulness belongs in small key components. Existing examples include the purple-to-orange tour carousel, the animated search border, and selected discovery accents. These examples establish permission for selective expression; they do not require every page or control to animate or become decorative. Future refinement can improve consistency, spacing, accessibility, and responsive behavior while keeping this approachable character.

**Key Characteristics:**

- Familiar and approachable Mantine controls.
- Neutral light and dark surfaces with clear task hierarchy.
- Small playful exceptions in museum discovery.
- Functional depth for overlays and floating controls.
- Prototype-informed direction with room for refinement.

## Colors

Use plain descriptive names. Mantine supplies the visitor-facing control palette; the Pascal/editor integration also has a separate neutral CSS-token layer. These namespaces coexist and should not be treated as interchangeable.

### Primary

- **Navigation blue** (`navigation-blue`): Mantine blue.6, used for common actions and the moving active-tab underline. Its hover step is blue.7. It is not the only navigation color: the existing bottom navigator entry is green and marketplace entry is red.

### Secondary

- **Tour purple / tour orange** (`tour-purple`, `tour-orange`): existing diagonal tour-card gradient, from Tailwind purple-700 to orange-400. Some labels use Mantine grape/orange gradients instead; those are related treatments, not identical color tokens.
- **Content teal** (`content-teal`): Mantine teal.6 is part of the content identity. Content-card borders currently use Tailwind teal-600, and headings use a Mantine teal/cyan gradient. Preserve the distinction when tracing styles; do not silently substitute one value for another.
- **Grape** (`grape`): existing Mantine grape.6 integration token used by decorative tour controls.

### Neutral

- **Light surface / subtle surface**: white and Mantine gray.0. Objects generally use neutral presentation so the museum image or object can lead.
- **Dark surface / dark control / dark border / dark-scheme text**: the rendered Mantine dark theme uses the corresponding frontmatter values. Use Mantine's semantic variables to switch schemes rather than hardcoding light surfaces throughout components.
- **Editor neutral tokens**: the global `--background`, `--foreground`, `--primary`, and `--border` use the OKLCH values recorded above in light mode. `.dark` supplies their alternate values. Editor primary is neutral and is not Mantine navigation blue.

Difficulty badges use green with a leaf for easy, yellow with a gauge for medium, and red.9 with a flame for hard. Labels and icons carry the meaning alongside color. The existing automatic contrast behavior is useful evidence, not proof that all prototype color combinations meet accessibility requirements.

## Typography

**Headline and body font:** Mantine's system sans-serif stack, recorded in frontmatter. No distinct branded display font is established. The separate Tailwind heading alias does not establish another typeface.

**Character:** familiar, readable, and practical. Typography should support museum content and quick decisions without requiring visitors to learn an editorial hierarchy unique to the app.

### Hierarchy

- **Headline:** Mantine h1, 2.125rem, weight 700, line-height 1.3; observed on the navigator entry screen.
- **Section heading:** Mantine h2, 1.625rem.
- **Title:** Mantine h3, 1.375rem; observed in object details.
- **Compact heading:** Mantine h5, 1rem; used in tour navigation.
- **Body:** 1rem with default line-height 1.55; supporting text commonly uses 0.875rem.
- **Label:** 0.875rem; compact footer labels use 0.75rem. Badge casing follows the component treatment rather than becoming a global uppercase rule.

These are inherited Mantine values, not a new custom scale. The prototype does not establish a universal reading-column width.

## Layout

Stack and Group compose most visitor interfaces. The app shell reserves a 64px footer and uses a bottom navigation group with icon-plus-label entries and a language switcher. This is an incumbent pattern, not proof that every prototype page currently handles footer overlap correctly.

Use the Mantine spacing vocabulary in frontmatter. Compact custom editor CSS also uses 0.375rem, 0.5rem, and 0.75rem gaps or padding; these are local layout measurements rather than additions to Mantine's named scale.

Content and object carousels show 60% slide width at base, 33.3333% at `sm`, and 25% at `md`, with `sm` slide gaps and start alignment. The inherited breakpoints are `xs: 36em`, `sm: 48em`, `md: 62em`, `lg: 75em`, and `xl: 88em`.

The museum map supports floating task controls. The staff creation toolbar is positioned at top 4.5rem and left 0.75rem, with bounded height and vertical scrolling. The object catalog keeps a scrollable body and wraps its actions. These measurements describe current layouts; they should be refined when content, touch use, or viewport constraints expose defects.

## Elevation & Depth

Depth is functional: restrained shadows distinguish floating controls and overlays from their background. Tour cards are a playful exception, using a stronger shadow and a stacked selection effect. Do not extend that effect to ordinary forms or every content container.

- **Toolbar:** `var(--mantine-shadow-xs)` separates the creation controls from the canvas.
- **Small surface:** `var(--mantine-shadow-sm)` is available through the inherited Mantine vocabulary.
- **Tour card:** `var(--mantine-shadow-lg)` supports the existing layered tour treatment.

Use the inherited shadow variables rather than introducing a competing shadow system. `.impeccable/design.json` records resolved shadow values for standalone previews.

## Shapes

Mantine provides the main radius scale: `xs` through `xl` in frontmatter, with `sm` as its ordinary default. Rounded images and cards coexist with pill-like search and badge controls. The creation toolbar uses `md`; the global search uses `xl` (32px at the observed base size).

The editor's `--radius` is separately 0.625rem, with derived multipliers in the global stylesheet. Do not mistake this for a replacement of Mantine's radius scale. Border-based grouping and image cropping remain useful even where shadows are present.

## Components

### Buttons

Familiar and approachable. Existing editor documentation establishes Mantine filled, default, light, and subtle variants, plus loading and disabled states. Use filled actions for clear emphasis and quieter variants for supporting actions according to the task. Preserve inherited hover and focus behavior; do not replace accessible controls with decorative containers.

Icon-only canvas actions use named tooltips and accessible button labels. The prototype also contains local white and gradient-adjacent discovery controls; these are scoped examples rather than a global button redesign.

### Inputs / Fields

Ordinary forms use Mantine TextInput and Textarea with labels, descriptions, required indicators, errors, and disabled states as documented in Storybook. The global search is an exception: a large rounded input with a search icon, purple border, and animated surrounding border. Its incumbent hardcoded copy and exact decoration remain eligible for refinement.

### Chips / Badges

Difficulty combines label, icon, and semantic color. Duration pairs a clock icon with a compact time label. Tour and content category pills may use white surfaces with colored or gradient text. Category appearance and difficulty meaning are separate concerns.

### Cards / Containers

Objects use relatively plain image-led cards. Contents use teal outlines and square image areas. Tours use purple/orange framing, stacked selection, and explicit previous/next controls. Object detail images use a 16:9 area with `md` radius. Reuse these distinctions where helpful, without copying prototype inconsistencies as requirements.

### Navigation

ArtaroundTabs uses a moving 2px blue bottom indicator, evenly distributed tabs, optional icons, and optional panels. Bottom app navigation uses green for Navigator and red for Marketplace, with light active and subtle inactive buttons and a separate language switcher. Preserve clear selected-state semantics as these patterns evolve.

Tour content opens in contextual Mantine modals while the map stays mounted. Closing returns to the current tour context. Shareable modal URLs and explicit visitor position are behavioral requirements in PRODUCT.md and `docs/tour-navigation.md`; visual refinements must preserve them.

### Motion and small playful exceptions

The current search border uses a four-second animation cycle. Tour stacked selection uses a 500ms transition. Tabs move their active indicator; the start-tour action also has a hover scale effect. These are observed prototype choices, not blanket motion requirements. Refine them for clarity, performance, and reduced-motion needs before treating them as polished patterns.

The user-supplied voice-reactive crystallized-ball reference in PRODUCT.md is a future assistance affordance, not an already implemented global visual motif.

## Do's and Don'ts

### Do:

- Do use Mantine as the main visual foundation for visitor and staff task controls.
- Do preserve an approachable feel for casual museum visitors.
- Do confine playfulness to small key components where it helps discovery or feedback.
- Do use functional depth for floating controls, with tour cards as a scoped playful exception.
- Do improve prototype inconsistencies, accessibility, and responsive behavior while preserving the intended feel.
- Do keep content meaning available through labels and icons as well as color.

### Don't:

- Don't treat every prototype measurement, gradient, or animation as an immutable brand requirement.
- Don't turn ordinary forms and navigation into continuously animated showcases.
- Don't confuse Mantine tokens with the separate Pascal/editor CSS-token layer.
- Don't present planned product capabilities or unverified accessibility compliance as implemented design evidence.

<!-- Extraction sources: src/theme.ts; src/app/[lng]/(frontend)/globals.css and layout.tsx; .storybook/preview.tsx; documented ArtaroundTabs, DifficultyBadge, ToursCarousel, ArtAroundGlobalSearch, object details and editor APIs; carousel and editor layout styles. Rendered navigator, tour carousel, and dark tabs were inspected. -->
