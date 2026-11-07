# Planned visits and family readers

The public navigator planner (`/[lng]/tour/plan`) implements the museum-visit
examples in the course brief, Navigator 18–33, PDF page 30. Marketplace UI and
authoring remain outside this work.

## Visitor flow

Choose a museum (or name it in interests), time, first/returning visit, interests,
adult count and children's ages. Museum mode fixes the museum server-side.
Missing ages are shown inline; invalid requests never reach the model. The
preview is saved in the tab and represented by `?tour=…`, so reload restores it
and Change returns to the answers.

The preview offers Start the visit and Start with a group. A family chooses
**Reading for** on each device: Adult (default), or one of the planned children's
ages. This chooses wording/detail for that reader, not a different itinerary.
The host's personal accessibility/reading choices reach the waiting room; invite
links remain profile-free. Family guests choose their reader before joining.

The existing LiveKit flow synchronizes the host's step and open content. Language,
accessibility and exact age remain personal URL parameters. A child opening the
same content as the adult requests an exact-age version; both age and audience
survive following, changing stops and reload. Original clears the personal
version, including age. Further explanations also retain the child's age.

## Rules and persistence

- `src/lib/tour-plan.ts`: validated constraints, request hash and strict reading
  plus estimated walking budget (two minutes per stop). An overlong first item
  is skipped; an entirely unsuitable selection returns a recoverable budget
  error rather than exceeding the visitor's time.
- `/api/plan-tour`: only free, public readable contents; one stop per artwork;
  ordered by the existing room-distance rule. The model chooses allowed IDs.
  Cached plans are rechecked for readable contents and current time estimates.
  Hash version 2 invalidates older plans made under the former budget rule.
- `reading-profile.ts`, `ReadingProfile`: shared parsing/selection behavior and
  a labeled control used by planner preview and family join. Only the planned
  age list reaches the join page, not interests or the complete request.
- `group.ts`, `tour-navigation.ts`: `age` and `audience` are personal; the host's
  location never broadcasts them. `seconds` is retained on the same open modal.
- `ContentVersion`, `ContentExpansion`, `/api/expand`: exact-age requests use
  separate prompts and variant keys. Earlier additions are matched to the same
  age. `contentVariants.age` is optional, so generic/legacy variants still work
  and never answer an age-specific request. Version lengths respect the API's
  3–900 second bounds, including very short authored captions.

## Verification (2026-11-06)

- 32 focused integration tests: planner, family reading, expansion, group rules
  and navigation URL preservation.
- `tests/e2e/planned-family.e2e.spec.ts`: two public-flow tests on the real Next
  app, MongoDB/Payload and local LiveKit. The family test uses three independent
  browser contexts; verifies submitted preferences, preview reload, real group
  creation/join, same content ID with ages 5 and 8, received readable text,
  host-only advancement, age persistence on the next stop and guest reload.
  The API test verifies validation, normalized-answer cache reuse, budget,
  distinct artwork stops and server-enforced museum mode.
- Read-only DB inspection confirmed separate saved age-5 and age-8 variants
  for the same content, both with valid three-second target lengths.
- Eight Storybook interaction/accessibility checks passed and cover profile selection, family
  preview/start, group-profile propagation, missing ages, short captions and
  age-preserving follow-up explanations.
- Manual captures/rendered Impeccable checks: mobile 390×844, desktop 1280×900,
  light/dark preview, form, validation error and family join. Local evidence is
  under `.impeccable/review/family-plan/` (ignored).

The language-model boundary uses the repository's AI SDK mocks (`AI_MOCK=true`)
for repeatability. These checks prove orchestration and age-specific requests,
not the factual/pedagogical quality of a real provider's prose. Browser animation
callbacks were throttled only in the three-context software-WebGL test; its
3.5-minute duration is not a production performance benchmark. External map
textures/telemetry were unavailable under the cloud network policy. No visual
regression suite, deployment, or physical-device sensor check was run.

Final Impeccable verdict: **`ship`** for the scoped planner/reader extension;
no material fixes remain in that review. Rendered contrast/leading/overflow
findings were resolved. The existing purple-to-orange tour identity still
triggers a palette heuristic and is intentionally retained with deeper shades;
it is not a contrast exception. The preview's Storybook-only “1 STOPS” artifact
comes from its empty translation fixture; the public English resource already
has the correct singular/plural entries. The final typecheck, scoped lint and
`i18next-cli extract --ci` pass. All five new keys exist in all 24 locales.

The documenter reconciled DESIGN.md and `.impeccable/design.json` with personal
reader selection and the scoped contrast treatment, preserving earlier navigation
changes and global tokens. Nothing was published, merged, or deployed.
