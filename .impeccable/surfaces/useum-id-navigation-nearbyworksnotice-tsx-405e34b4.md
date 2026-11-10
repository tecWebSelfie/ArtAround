---
version: 1
slug: 'useum-id-navigation-nearbyworksnotice-tsx-405e34b4'
primary_target: 'src/app/[lng]/(frontend)/museum/[id]/navigation/NearbyWorksNotice.tsx'
related_targets:
  [
    'src/app/[lng]/(frontend)/museum/[id]/navigation/NavigationProximity.tsx',
    'src/app/[lng]/(frontend)/museum/[id]/navigation/GuidanceSettings.tsx',
    'src/app/[lng]/(frontend)/museum/[id]/navigation/TourNavigation.tsx',
    'src/app/[lng]/(frontend)/museum/[id]/navigation/NavigationServices.tsx',
    'src/app/[lng]/(frontend)/museum/[id]/navigation/TourProgress.tsx',
    'src/app/[lng]/(frontend)/museum/[id]/navigation/DirectionsBar.tsx',
  ]
---

# Navigation proximity — Operate

Confirmed in the maintainer's voice session: nearby works are suggested from
estimated GPS position and device heading; distinguish the next destination
from optional discoveries, and withdraw suggestions when the visitor leaves.

## Direction contract

THESIS: recognize the physical work without interrupting navigation or silently
changing the confirmed position. A nearby destination and an optional detour
must read differently through words, icons and button treatment.

OWN-WORLD: retain ArtAround's Mantine body surface, system typography, primary
action and neutral discovery actions. No new palette or decorative animation.

STORY: enable GPS, optionally authorize the compass, approach a work, then open
its description or explicitly confirm “I am here”. Several candidates show
their small images and names; missing images retain usable text/actions.

FIRST VIEWPORT: a compact, scrollable notice inside existing map controls,
above navigation shortcuts; it never traps focus or obscures the entire map.

FORM: code-led narrow extension of existing navigation. seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification targets

Phone and desktop, dark/light themes; ambiguous works, absent images, permission
denied/unavailable compass, leaving range, GPS loss and explicit confirmation.
Hysteresis: enter 3 m / 30°, leave 4.5 m / 45°. No new raster assets.

## Finish review

Polish/harden: separate open and position-confirm actions; no modal/focus trap;
silent or denied compass falls back to nearby choices; stale GPS/orientation
expires; duplicate placed works do not consume multiple candidate slots.
The AA contrast finding on the default primary shade was corrected using the
deeper museum-primary shade; focused Storybook accessibility checks then passed.

Adapt: inspected the four-choice notice at 390×844 and 1280×800 in light mode,
and at 390×844 in dark mode. No horizontal overflow. Vertical scrolling retains
access to all choices while leaving the map available.

Extract/document: the notice is one navigation-specific composition of existing
Paper, Button and ActionIcon, not a new global primitive. No new tokens or
duplicated pattern used three times; DESIGN.md records its semantic variants.

Verdict: browser interaction and accessibility checks pass for the implemented
surface. Hardware sensor accuracy and the complete physical museum visit remain
unverified. No new shipping raster assets, no visual regression run.

## Audit follow-up: adapt, harden, polish

The maintainer authorized the four findings in docs/plan/tour-navigation-audit.md.
Preserve the Mantine world while budgeting overlays between measured bars.
Keep Scan, Search and Settings available; secondary services use an accessible
popover, and notices/tour shortcuts can scroll within the remaining space.
Use minimum 44px hit areas and verify small-text contrast. Do not add new
fonts, colors, decorative motion or marketplace changes. Recheck landscape,
320px phones, 200% text, keyboard/touch, and light/dark themes.
