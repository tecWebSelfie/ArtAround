---
version: 1
slug: 'src-app-lng-frontend-tour-plan-planvisitpage-tsx'
primary_target: 'src/app/[lng]/(frontend)/tour/plan/PlanVisitPage.tsx'
related_targets:
  [
    'src/components/group/ReadingProfile.tsx',
    'src/components/group/StartGroupButton.tsx',
    'src/app/[lng]/(frontend)/room/[code]/GroupRoomPage.tsx',
    'src/components/expansion/ContentVersion.tsx',
    'src/components/expansion/ContentExpansion.tsx',
  ]
---

---

version: 1
slug: "src-app-lng-frontend-tour-plan-planvisitpage-tsx"
primary_target: "src/app/[lng]/(frontend)/tour/plan/PlanVisitPage.tsx"
related_targets: ["src/components/group/ReadingProfile.tsx","src/components/group/StartGroupButton.tsx","src/app/[lng]/(frontend)/room/[code]/GroupRoomPage.tsx","src/components/expansion/ContentVersion.tsx","src/components/expansion/ContentExpansion.tsx"]
---

# Planned family visit — requirement completion

Mode: Operate. Scope: an extension of the established planner/group forms.
Source: course brief, Navigator 18–33, PDF page 30; marketplace excluded.
The maintainer explicitly authorized completing the remaining planner flow.

THESIS: One itinerary for the family; each device chooses who reads it.
OWN-WORLD: Preserve Mantine forms, compact museum metadata, existing planner
column and group waiting room. Keep the user-approved ember treatment local to
the interests field; add no fonts or assets.
STORY: Enter available time, previous visits, interests and family composition;
review the saved route; choose this reader; visit alone or open a group; guests
choose adult or a planned age before joining. Host leads stops/modal; each
child requests an exact-age version of the same facts, persisting across stops.
FIRST VIEWPORT: The interests field leads the form; the saved-plan preview
hierarchy remains. A labeled Reading for Select precedes Start/Change; Start
with a group uses its existing form.
FORM: The textarea remains a natural-language field, not a chat. Example chips
insert into it; time, museum and step-free constraints follow in a compact
group. Family composition stays in the existing summary disclosure.

## Invariants and proof

- Never force the whole family into children's text; adult is the default.
- Reader age is personal URL state, not shared LiveKit location state.
- Distinct ages have distinct saved variants; additions retain age too.
- Budgets include the existing estimated walking allowance and are never
  exceeded to force in an overlong first item. No-fitting-content has recovery.
- Private and locked contents are excluded; one work is not repeated for its
  different descriptions; cached plans are rechecked against current contents.
- Mobile/desktop, light/dark, family join, missing ages, errors, reload and
  keyboard interactions are checked without a visual-regression suite.
- Browser flow uses real local Payload/MongoDB and LiveKit, with the AI SDK
  mock at the model boundary; no claim about real provider prose quality.

## Finish evidence

32 integration tests, two real-app/group e2e tests and eight interaction/a11y
stories passed. The model boundary uses AI SDK mocks. A two-second-caption
failure was fixed by respecting the version API's minimum length. Manual
captures and detector data live in `.impeccable/review/family-plan/` (ignored).
New controls have readable selected/neutral states, theme help and errors;
the tour start retains its identity with deeper existing shades. Independent
finish disposition: ship for this scoped extension. Design documentation and
sidecar reconciled. No new shipping rasters or global design tokens.

## Read-aloud hardening refinement (2026-11-07)

The existing Listen primitive now accompanies the displayed saved personal
version, using the same difficulty/duration/audience/age request as its text.
Switching reader or locale cancels preparation and replaces the player. The
refinement adds no design tokens or new control style. Impeccable harden/polish
review inspected mobile, desktop and mobile-dark captures without overflow;
four focused interaction/a11y stories passed without reported violations.
Captures: `.impeccable/review/personal-audio/`. This is a local refinement review,
not a new independent ship verdict. The real public family E2E also passed the
age-specific audio route/job/file flow with only the provider mocked.

## Plan-my-visit hero refinement (2026-11-15)

The maintainer selected the first live direction: the existing Interests textarea leads the form, with the same amber halo at rest, counter at the lower left, and compact "Dettatura" pill at the lower right. Example chips insert into the field; time, global-mode museum, and step-free controls follow, then the existing family disclosure and submit. Keep the visual order and copy fixed across close style alternatives. While recording, the pill stays near its idle width and shows stop, voice bars and elapsed time; it never grows to the field's full width. Preserve the existing plan/preview URL, sessionStorage, group-tour and family-reader behavior. This page-specific halo is the approved exception to the global assistant-orb color rule, not a new accent for other controls.

## Dictation pill spacing refinement (2026-11-27)

The bottom row (counter and dictation pill) is taller than Mantine's fixed
1.75rem bottom strip, which centered it and pushed the pill onto the field's
bottom border (~1.8px) while the smaller counter floated (~11.4px). The row is
now content-sized and in flow below the input, so its own paddings (0.4rem
above, 0.75rem below) are the pill's real distance from the edge: 12px, at
least the counter's old breathing room. The regression story
(DictationPillKeepsItsBreathingRoom) failed on the buggy code at 1.8px and
passes at 12px; before/after captures in `.impeccable/review/plan-dictation-padding/`.
No tokens, copy or states changed: the halo, chips, counter position and
recording behavior are untouched, and long interim previews can no longer
overflow the field. DESIGN.md's plan-visit paragraph still matches the
shipped UI, and the two one-off row paddings are page-scoped, not tokens.
