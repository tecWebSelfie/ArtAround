# Tour navigation — Impeccable technical audit

Date: 2026-11-06. Branch: `db-populate`. Scope: the complete tour-navigation
screen, especially its top bar, bottom bar and overlay controls. Audit only;
no application source changes were made during this pass. Marketplace excluded.

## Implementation integrity verdict

**Pass for product coherence; technical release issues remain.** The screen
expresses a museum visit: ordered works and metadata above, map and destination
actions in the middle, directions and an optional voice assistant below.
Destination and discovery notices remain distinguishable. This is not a generic
dashboard. The automatic detector nevertheless confirms low contrast and
occluded text in specific states; coherence does not waive those failures.

## Executive summary

**Audit health: 13/20 — Acceptable, significant work needed.** Four verified
issues: **0 P0, 3 P1, 1 P2, 0 P3**. The main risks are loss of controls on short
screens and enlarged text, and inadequate contrast in the light theme.

| Dimension                | Score            | Evidence / principal limitation                                                                                  |
| ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Accessibility            | 2/4              | Light-theme action and duration text below AA contrast; keyboard and focus-return checks pass                    |
| Performance              | 3/4, provisional | Paused/reduced-motion assistant and map pause during scanning exist; no production/hardware frame-rate benchmark |
| Theming                  | 3/4              | Examined light/dark chrome uses theme tokens; dark scan clean, museum-specific palettes not exercised            |
| Responsive design        | 2/4              | Ordinary phone/desktop fit; landscape proximity and 200% text lose access to controls                            |
| Implementation integrity | 3/4              | Coherent museum-specific structure; fixed vertical composition fails under increased content pressure            |
| **Total**                | **13/20**        | **Acceptable; fix the P1 findings before release**                                                               |

## Method and coverage

Real Impeccable engine **0.1.16**, source inspection, rendered `detect --cdp`,
axe-core **4.13.0**, DOM geometry/hit testing, screenshots, keyboard actions,
and synthesized Chromium touch input. This follows the installed Impeccable
`reference/audit.md`, rather than substituting a visual opinion for measurements.

The audited surface is the complete `TourNavigationPage` rendered in Storybook
with its real components and fixture museum/tour. It is not the authenticated
deployed application. The global browsing header is intentionally absent on
this immersive route, as documented in the existing desktop surface brief.

| Case          | Viewport | State                                     | axe / Impeccable                              |
| ------------- | -------- | ----------------------------------------- | --------------------------------------------- |
| Phone         | 390×844  | Confirmed position and destination, light | Contrast / low contrast                       |
| Small phone   | 320×568  | Same                                      | Contrast / low contrast                       |
| Desktop       | 1280×800 | Same; keyboard/settings check             | Contrast / low contrast                       |
| Dark desktop  | 1280×800 | Same                                      | No findings / no findings                     |
| Nearby phone  | 390×844  | Simulated movement, next-work notice      | Contrast / low contrast                       |
| Landscape     | 844×390  | Same, with simulator and notice           | No findings / low contrast and text occlusion |
| Enlarged text | 390×844  | Root font size 200%, no simulator         | No findings / text occlusion                  |

Additional checks:

- A real synthesized touch swipe moved the top-bar scroller from `scrollLeft`
  **0 to 235 px**, exposing later stops.
- Desktop Tab navigation reached overlay controls and the assistant. Closing
  guidance settings with Escape returned focus to its trigger.
- The active `DirectionsBar` story was tested separately: a synthesized tap
  advanced from step 1 to step 2, the full-directions dialog opened, and Escape
  returned focus to “Show all directions”. Its arrows measured **28×28 px**.
- A layout-only landscape comparison hid the development D-pad while retaining
  the same proximity state. The loss of controls remained; it is not caused
  solely by the simulator. This comparison is explicitly not a physical-GPS test.
- A separate browser-geolocation attempt did not produce a proximity notice
  within its observation timeout. Without establishing the route/anchor timing,
  that observation is inconclusive and is not classified as an application defect.

Captures and raw measurements are retained locally under
`.impeccable/review/tour-audit/` (ignored): `results.json`, per-case JSON/PNG,
`landscape-without-dpad.*` and `footer-directions.*`.

## Detailed findings

### A1 — [P1] Light-theme action and top-bar duration text lack contrast

- **Location:** `src/app/[lng]/(frontend)/museum/[id]/navigation/TourNavigation.tsx:631`
  (“Open next stop”), `TourProgress.tsx:133`, and
  `src/components/mantine/DurationBadge.tsx:16` (duration chips).
- **Category:** Accessibility.
- **Evidence:** axe reports white **#ffffff** text on **#228be6** at **3.55:1**
  for the 14 px primary action. Impeccable separately reports the same color
  pair at approximately **3.6:1** for the top-bar duration chip. Both are small
  text, so the required AA ratio is **4.5:1**, not the large-text 3:1 threshold.
  The dark desktop sample passes these scans.
- **Impact:** visitors with low vision, or using the phone under difficult
  lighting, have reduced access to a principal action and stop-duration metadata.
- **Standard:** WCAG 2.2 **1.4.3 Contrast (Minimum), AA**.
- **Recommendation:** select verified foreground/background pairs for the
  filled action and duration badges, including each supported museum palette.
  The nearby-work notice already uses a deeper primary shade; do not assume
  the generic `autoContrast` setting alone proves the required ratio.
- **Suggested command:** `$impeccable harden` on tour controls and duration badges.

### R1 — [P1] Landscape proximity pushes essential overlay controls below the screen

- **Location:** `TourNavigation.tsx:618`–`623` (vertical control composition and
  fixed `pt-36` offset), `NearbyWorksNotice.tsx:29` (notice height boundary).
- **Category:** Responsive Design / Implementation Integrity.
- **Evidence:** at **844×390**, the simulator-plus-notice state puts Scan at
  approximately **y=619..659**, entirely outside the viewport. In the layout-only
  comparison with the D-pad hidden, the notice still occupies **y=144..286**,
  while Scan is **y=464..504**, and Search/Guidance settings are **y=470..504**.
  Their centers are not hittable. The document does not expose vertical scroll
  that would recover them. Impeccable also identifies the notice occluding the
  bottom “Finding your route” text in the original landscape state.
- **Impact:** visitors cannot reach scanning, search or guidance settings while
  viewing the proximity suggestion on a short/landscape screen.
- **Standard:** orientation/reflow robustness; related WCAG **1.3.4 Orientation**.
  The demonstrated failure is loss of access, not a claim that all landscape
  navigation or all orientations fail.
- **Recommendation:** allocate available height from the actual header/footer
  and collapse or relocate secondary controls for short viewports. Bound and
  scroll the combined overlay area, not only the notice. Keep essential actions
  visible without relying on the fixed top offset.
- **Suggested command:** `$impeccable adapt` on the full tour-navigation overlay.

### R2 — [P1] At 200% text size, overlay actions cover the bottom bar

- **Location:** `TourNavigation.tsx:618`–`645` and its footer composition at
  `TourNavigation.tsx:468`; shared shell configuration at
  `src/app/[lng]/(frontend)/layout.tsx:50`.
- **Category:** Accessibility / Responsive Design.
- **Evidence:** at **390×844** with root text size **200%**, the header grows
  to approximately **248 px**, and the footer occupies **y=716..844**. Overlay
  service buttons and Scan overlap that footer; Search/Guidance settings are
  at **y=836..904**, partly outside the viewport. Impeccable measures **36%**
  occlusion of “Finding your route”. The screenshot confirms unreadable footer
  text and obstructed controls. No horizontal document overflow is needed for
  this failure to occur.
- **Impact:** increasing text for legibility reduces access to navigation
  instead of preserving it. The bottom bar no longer provides a reliable,
  unobstructed place to read directions.
- **Standard:** WCAG **1.4.4 Resize Text, AA**: text must be resizable to 200%
  without loss of content or functionality.
- **Recommendation:** let the control groups and directions area reflow with
  enlarged text; use a recoverable secondary-controls surface when height is
  exhausted. Verify the entire composition at 200%, not just individual labels.
- **Suggested command:** `$impeccable adapt` on the top/overlay/bottom composition.

### R3 — [P2] Frequent touch actions use undersized targets

- **Location:** `TourNavigation.tsx:747`–`754` (`ServiceIcon`),
  `TourNavigation.tsx:681` and `:724`, `GuidanceSettings.tsx:60`,
  `DirectionsBar.tsx:147` and `:170`, `NearbyWorksNotice.tsx:42`.
- **Category:** Responsive Design / Accessibility.
- **Evidence:** services and exit buttons **28×28 px**; Search, wheelchair and
  guidance settings **34×34 px**; active directions arrows **28×28 px**;
  proximity dismiss **28×28 px**; Scan **40 px high**. Top-bar stop buttons are
  approximately **38.7 px high**. These are below the audit's **44×44 px** target.
- **Impact:** repeated taps while walking require unnecessary precision;
  closely stacked services are especially easy to confuse.
- **Standard:** the 44 px recommendation corresponds to WCAG **2.5.5 Target Size
  (Enhanced), AAA**. A 28 px target is **not automatically an AA violation**:
  WCAG 2.5.8's AA minimum is 24 px and includes exceptions. Hidden/scroll-clipped
  stepper controls are not counted as missing functionality simply because their
  DOM rectangles exist outside the visible track.
- **Recommendation:** expand hit areas and spacing while retaining compact
  visual icons; keep the full cluster reachable on short screens. Avoid solving
  target size by making the existing vertical-overflow problem worse.
- **Suggested command:** `$impeccable adapt`, followed by `$impeccable polish`.

## Patterns and positive findings

The main systemic problem is vertical budgeting: header content grows, the
overlay assumes a fixed offset and stacks several groups, and the bottom area
is expected to remain available independently. A bounded individual notice is
insufficient when the complete overlay stack exceeds the available height.
Compact ActionIcon defaults recur across unrelated essential controls.

Preserve these strengths:

- Native, named buttons; sensible overlay grouping and explicit pressed states.
- Working touch scrolling in the top bar, including access to later tour stops.
- Keyboard-reachable main actions and correct focus return from tested dialogs.
- Separate confirmed position and GPS estimate, and separate Open / I am here.
- Clear next-destination versus discovery wording and action treatment.
- No horizontal document overflow in the seven captured cases.
- The assistant is paused when off, honors reduced motion, and opens its
  microphone only in the listening state. The map has a pause path for scanning.

## Limitations and false-positive handling

- axe's clean results for landscape/200% text do **not** invalidate geometric
  occlusion observed by Impeccable and hit testing; the tools cover different checks.
- Horizontal clipping of later steps is intentional and recoverable by the
  touch scroller. It is not classified as inaccessible missing content.
- Fixtures mix English UI and Italian editorial titles; that is not evidence of
  a localization bug in the deployed application.
- Some full-screen captures show the GPU map still loading. The separate active
  directions story covers footer behavior; this audit does not claim complete
  GPU-route readiness for every capture.
- Storybook/development loading and software-rendered Chromium are not a
  production performance benchmark. The performance score is provisional;
  no frame-rate, bundle-size or physical-device guarantee is implied.
- This pass does not certify real GPS/compass accuracy, voice-provider behavior,
  custom museum palettes, or host/guest permission flows.

## Recommended actions

1. **[P1] `$impeccable adapt`** — repair the shared vertical composition for
   landscape and 200% text while keeping Scan, Search and Settings recoverable.
2. **[P1] `$impeccable harden`** — correct and verify light-theme contrast for
   the primary action and top-bar duration metadata.
3. **[P2] `$impeccable adapt`** — enlarge the effective touch targets without
   reintroducing vertical overflow.
4. **`$impeccable polish`** — finish the corrected composition and repeat the
   same scoped audit for comparison.

These commands can be requested individually, together, or in another order.
Rerun `$impeccable audit` after fixes to compare against this baseline.

## Follow-up — adapt, harden and polish (2026-11-06)

The maintainer authorized implementation of the four findings above. The
historical score and captures remain the baseline, not a description of the
corrected screen.

- **A1:** navigation duration badges and the next-stop action now use the
  deeper museum-primary shade with automatic foreground contrast.
- **A2/A3:** the overlay is bounded by measured header/footer heights. Its
  essential dock stays outside the scrollable simulator/notice/tour-action
  column. Services use a separate, bounded popover. The footer expands with
  wrapped directions; the assistant retains its intrinsic width.
- **A4:** navigation action targets, stepper controls, simulator arrows and
  direction arrows are at least 44px. Long action labels wrap rather than
  forcing horizontal overflow.

Focused verification: 38 integration tests and 10 Storybook interaction/a11y
stories passed; the full TypeScript check passed. The repeated seven-state
axe scan reported no violations and no horizontal document overflow. The
Impeccable rendered detector no longer reported contrast or text-occlusion
findings; landscape retained a `flat-type-hierarchy` heuristic while only the
simulator was visible in its scrolled column. This is not a contrast failure.

Follow-up captures/measurements are under `.impeccable/review/tour-adapt-audit/`
and `.impeccable/review/tour-adapt/` (ignored). Software WebGL saturated the cloud
CPU during some interaction attempts. Follow-up layout browsers capped their
animation callbacks at approximately 10fps; a touch-only pass also reduced
render pixel density while retaining CSS viewport dimensions. These are scoped
layout and interaction checks, not evidence of production rendering performance.
No visual-regression suite or physical-device sensor test was run.

Final synthetic-touch recovery passed in landscape (844×390) and enlarged text
(390×844 at 200%): Open/Confirm/Next/Resume were all reached by actual dispatched
touch gestures, and Services/Scan/Search/Settings stayed hittable at every
sample. Content mutations are observed as well as outer size changes because a
bounded proximity notice can change scroll overflow without changing its box.
Fresh stable chrome-only captures and paired geometry live under
`.impeccable/review/tour-adapt-final/`; these supersede the earlier follow-up PNGs
where a footer layout update occurred between capture and geometry sampling.
The map canvas remains outside this chrome-only finish review.

The independent review caught one remaining A3 case: active directions at 200%
were squeezed between enlarged arrows and the assistant. The corrected strip
now gives the instruction a full-width row and keeps arrows/assistant together
below it when its container is narrow. The fresh `text-200-active` capture shows
both the step counter and complete arrival sentence, with dock controls entirely
above the footer. The directions interaction/a11y story and full typecheck were
repeated successfully after this correction.

Final verdict: **`ship` for the scored A3 footer correction**. The independent
reviewer re-read the overwritten `text-200-scrolled.png` and paired geometry:
complete step counter/instruction above arrows and assistant, essential dock
above the footer, and all footer controls inside the viewport. No regressions
were identified from that correction. A final touch-only recheck on the stable
active route scrolled the secondary-action column from 0 to 68px (its end).
The earlier landscape/200% full-notice touch pass remains separate evidence;
a repeated sensor-fixture attempt timed out before obtaining a notice and is
not counted as another pass. The verdict covers the scored fix, not the whole
navigation surface or hardware sensors. DESIGN.md and `.impeccable/design.json`
were reconciled without introducing new global tokens or marketplace changes.
