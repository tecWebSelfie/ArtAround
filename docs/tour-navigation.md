# Tour navigation: implementation and agent handoff

Last reviewed: 2026-10-18. This document describes the working tree, including
uncommitted changes. Check source and Git status before resuming; local process IDs
and cached build artifacts are not reliable handoff state.

## Agreed product behavior

- Desktop and mobile use the same ordinary map view.
- The avatar marks the visitor's explicitly confirmed position. Opening a QR link
  or reading content must not change that position.
- Tour contents retain their original order. The cursor counts completed contents:
  `0` means the first content is next; `contents.length` means tour completed.
- Objects and contents outside the next tour stop can be explored independently.
  Only the expected next content opens the `open` modal with the advance action.
- A visitor can explicitly choose an object (including a content's associated
  object) as their position or as an alternative destination.
- Advancing retains position and clears the alternative destination. Resuming the
  tour route also clears that destination without advancing the cursor.
- A stop that can no longer be visited (its content is gone, is about no object,
  or its object is no longer placed on the map; `unavailableStops` in
  `src/lib/tour-navigation.ts`) stays in the tour. The stepper shows it greyed,
  struck through and "Skipped", not selectable. When the cursor reaches it,
  `SkippedStopModal` lists the consecutive unavailable stops and its one action
  moves the cursor past them (`nextVisitableStep`), keeping position and clearing
  `to`; skipping the last ones completes the tour. Group guests see the modal
  without the action (the host's skip moves them). "Open next stop" is withdrawn
  meanwhile. A museum with no map at all flags nothing ("Map not available").
- Map interaction opens only museum object items, not walls or other geometry.
- Canonical QR values are ordinary Next.js paths such as `/object/ID`,
  `/content/ID` or `/tour/ID`. Printed and shared codes are **language-free**: a
  camera app opens them through the i18n proxy in the visitor's language, the
  in-app scanner in the app's language (`inLanguage` in `src/lib/app-url.ts`,
  which also replaces the prefix of older `/it/…` codes). Contextual tour modals
  must remain reloadable and shareable. Do not add a separate QR identifier system.

## URL and route contract

Base: `/[lng]/tour/[id]/navigation/[stepId]`.

| State                                 | Location                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Completed-content cursor              | `stepId` pathname segment                                                                      |
| Confirmed position                    | `?at=OBJECT_ID`                                                                                |
| Optional alternative destination      | `?to=OBJECT_ID`                                                                                |
| Wheelchair routing                    | `?mobility=wheelchair`                                                                         |
| Expected next content                 | `/open` parallel modal                                                                         |
| Other content                         | `/content/CONTENT_ID` parallel modal                                                           |
| Object details                        | `/object/OBJECT_ID` parallel modal                                                             |
| Scanner                               | `/scan`                                                                                        |
| End-of-tour quiz, if the tour has one | `/[lng]/tour/[id]/quiz?from=N`, outside this layout ([tour quiz](tour-quiz.md))                |
| Group join page and waiting room      | `/[lng]/room/{code}`; in a group, guests follow the host's URL ([group tours](group-tours.md)) |

`src/lib/tour-navigation.ts` centralizes cursor validation, URL state forwarding,
next-content routing, and museum object identification. `at`, `to`, and the
optional wheelchair profile are forwarded between canonical and contextual routes.

The navigation layout owns `TourNavigationShell`, so the map survives modal and
step transitions. It shares the tour/catalog and map-derived placed IDs with the
parallel modal slot. Client components read `lng`, `id`,
`stepId`, `at`, and `to` directly with Next's route and search hooks; there is no
URL state context to keep synchronized.

Inside `[stepId]/@modal`, `(...)[lng]/content/[contentId]` and
`(...)[lng]/object/[objectId]` intercept canonical QR navigation and redirect into
the contextual URLs. The explicit contextual pages handle reloads. Null default,
base, and catch-all modal pages clear the slot on dismissal/navigation.

The obsolete ancestor `tour/[id]/@step` slot and its slot-only parent layout were
removed: they intercepted the same content and caused compilation failures.
Do not restore a second interceptor for the same canonical route. After changing
route topology, run `pnpm exec next typegen` to refresh generated route types.
Read the installed Next guides in `node_modules/next/dist/docs/` for route changes.

## Free navigation (no tour)

Base: `/[lng]/museum/[id]/navigation`. The same persistent shell
(`TourNavigationShell` with `tour={null}`) and the same URL keys (`at`, `to`,
`mobility`, `service`, `exit`, `audience`); there is no cursor, no `/open` and
no quiz. `src/lib/tour-navigation.ts` exposes `NavigationScope`
(`{ kind: 'tour', tour, step }` / `{ kind: 'free', museumId }`) with
`navigationBasePath()` and `navigationContentPath()`; modal close, object
actions, scanner and commands derive "here" from it through
`useNavigationScope()`.

| State                    | Location                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Free map                 | `/[lng]/museum/[id]/navigation`                                                           |
| Content / object (modal) | `…/navigation/content/ID`, `…/object/ID`                                                  |
| Scanner                  | `…/navigation/scan`                                                                       |
| Start one of its tours   | Spotlight `tour:ID` → `/[lng]/tour/ID/navigation/0`, keeping `at`, `mobility`, `audience` |

- Entry points: "Explore the map" on the museum page, "Find it on the map" on
  a content page (opens `…/content/ID?to=OBJECT`), both from
  `src/lib/navigation-entry.ts` and offered only when the museum has a saved map.
- The museum detail page lives in the `museum/[id]/(details)` route group so its
  `@object` interceptor does not wrap the navigation tree: the free tree has its
  own `@modal/(...)[lng]/{content,object}` interceptors (one per tree).
- Group tours stay tour-only. Phase 2 moves tour navigation under
  `/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]` (one shell, the map
  stays mounted when a tour starts), with permanent redirects from the current
  `/[lng]/tour/[id]/navigation/...` URLs and the group/QR/test updates.
- Until then, a temporary redirect in `next.config.ts` glues the two:
  `/[lng]/museum/[id]/navigation/tour/[tourId]/[...rest]` (query kept) lands on
  `/[lng]/tour/[tourId]/navigation/[...rest]`. New links may already use the
  museum shape; phase 2 inverts the redirect.

## Code map and reuse boundaries

All navigation paths below are relative to
`src/app/[lng]/(frontend)/tour/[id]/navigation/`.

| File                                    | Responsibility                                                  |
| --------------------------------------- | --------------------------------------------------------------- |
| `layout.tsx`, `TourNavigationShell.tsx` | Persistent map and shared server data                           |
| `data.ts`                               | Cached tour read; museum/map catalog summaries                  |
| `[stepId]/TourNavigation.tsx`           | Composes map, controls, directions navbar, guidance and orb     |
| `[stepId]/MuseumMap.tsx`                | Museum item clicks, avatar, destination and saved-navmesh route |
| `NavigationObjectActions.tsx`           | Related content, explicit position/destination actions          |
| `[stepId]/@modal/open/StepModal.tsx`    | Next/complete action, retaining `at` and clearing `to`          |
| `[stepId]/NavigationModal.tsx`          | Shared contextual modal dismissal                               |
| `[stepId]/scan/QrScanPage.tsx`          | Allowed canonical QR paths and Next navigation                  |

Other shared files:

- `src/components/pascal/MapViewer.tsx`: plugin loading, scene readiness, fit bounds,
  custom selection-manager option, and orbit enablement.
- `src/components/pascal/Avatar.tsx`: cached GLTF via Drei `Clone`, scale `0.38`
  (source is approximately 4.5 m tall), `dispose={null}` protects cached resources.
- `src/lib/pascal/navigation.ts`: updated world bounds -> nearest navmesh polygon;
  only complete Navcat paths are displayed, never partial paths as successful routes.
- `src/lib/pascal/navmesh-options.ts`: walking and wheelchair generation profiles.
  Saving the editor map extracts Pascal navigation geometry once and generates
  `Museums.navMesh` (walking) and `Museums.navMeshWheelchair`. Runtime reads the
  selected saved mesh and does not regenerate it. Older museum records need a map
  save to gain the wheelchair mesh; no walking fallback is used for that mode.
  The experimental profiles use 2.5 cm horizontal cells, 25/35 cm radii,
  17/2 cm climb thresholds, and 35/4.57 degree slope thresholds. Vertical cells
  are 1 cm: NavCat caps compact-span clearance at 255 voxels, so the supplied
  5 mm value cannot represent the required 2 m height and generated empty meshes.
  These parameters do not certify a route's real-world accessibility.
- `src/components/Scanner.tsx`, `src/lib/app-url.ts`: real scanner and same-origin
  canonical URL parsing. The scanner locks after the first valid decode.
- `src/lib/localized-page.ts`: cached server document reads reuse `resolveLocalized`.
  Canonical object/content pages and contextual modals share the details components.
- `src/app/i18n/locales/{en,it}/tour-navigation.json`: feature strings.

Museum catalog placement already preserves Payload object IDs in
`ItemNode.asset.id` and sets `asset.category = 'museum-objects'`.
Use `museumObjectId()`; do not match model URLs to identify records.

Pascal uses WebGPU. The path uses Three's WebGPU `Line2` and `Line2NodeMaterial`;
Drei's WebGL line material failed here. R3F owns geometry/material disposal.
Manually disposing memoized resources in effects previously broke Strict Mode.
The route is a simple 5px navigation-blue line at 80% of the displayed avatar
height, approximately face level. It renders after the walls without depth
testing so the full route remains visible from the map camera.
`NavigationPath` updates its geometry in a layout effect when Navcat points change:
changing an `onUpdate` callback alone does not update R3F geometry after a URL change.

Elevator endpoints are not currently authored in the Pascal map. NavCat's
`addOffMeshConnection` should run when saving each profile mesh once those
endpoints are represented in map data, then the connections can be persisted with
the navmeshes. This avoids mutating a shared loaded mesh on every visitor route
query. An elevator connection needs a known start/end landing and an attachment
check with `isOffMeshConnectionConnected`; a visual elevator alone is insufficient.
The `RouteBetweenObjects` story uses `src/mocks/tour-navigation.mock.ts`, with a real
Navcat mesh and two catalog items separated by a divider, to show the detour.

## Route guidance, GPS, suggestions and voice assistant

Added 2026-10-19. One idea ties these together: **every visitor action is a URL
command** (`[stepId]/navigation-commands.ts`). The Spotlight results, the
empty-Spotlight pills, the overlay buttons and the voice assistant all run the
same `NavigationCommand` (`router.replace` for URL state, `router.push` for modals).

| Piece              | Files                                                                                                     | How it works                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directions         | `src/lib/museum-rooms.ts`, `src/lib/tour-directions.ts`, `[stepId]/DirectionsBar.tsx`                     | Route sampled every 0.5 m → room of each sample (Pascal `ZoneNode`) → a step per room change, naming the nearest `DoorNode` (≤ 2 m) and the turn from the angle between legs → arrival side. No AI; i18n templates; the first step has no turn because heading is unknown.                                                                                                                                          |
| GPS progress       | `src/lib/gps.ts`, `[stepId]/gps-source.ts`, `[stepId]/use-route-guidance.ts`, `[stepId]/GpsSimulator.tsx` | Anchor = confirmed start + the GPS fix taken there. Estimate = anchor + offset (equirectangular metres; map drawn north-up, north = −z). Snapped to the closest point on the route → step by distance walked. Fixes worse than 50 m are ignored. The estimate never writes `at`.                                                                                                                                    |
| Nearby suggestions | `src/lib/nearby-suggestions.ts`, `[stepId]/use-nearby-suggestions.tsx`                                    | On entering a room, off-tour contents of that room's objects, once per visit, as one Mantine notification (top-center) with Open / Go there; also listed as "Nearby" pills. Paid locked contents show `LockedPriceBadge`.                                                                                                                                                                                           |
| Voice assistant    | `src/components/assistant/*`, `src/app/api/assistant`, `src/app/api/speech`                               | Tap the orb → one `MicVAD` from `@ricky0123/vad-web` (Silero VAD in the browser), created on the first tap and reused, closes the mic at the end of speech → `/api/assistant`: Groq Whisper transcript + one `generateText` with `Output.object({ reply, commandId })` restricted to the offered command ids → the browser runs the command; `/api/speech` (Fish Audio) speaks the reply. Plain JSON, no streaming. |
| Settings           | `[stepId]/GuidanceSettings.tsx`                                                                           | Opt-in switches (assistant, spoken directions, suggestions) and GPS mode, in localStorage.                                                                                                                                                                                                                                                                                                                          |

The catalog (`data.ts`) is read **as the viewer** so each content summary carries
`price` and a server-computed `locked`; the body never reaches the client.

Configuration:

- `GROQ_API_KEY`, `FISH_API_KEY` (server runtime env). Both AI routes have a
  per-IP in-memory limit (`src/lib/rate-limit.ts`).
- `NEXT_PUBLIC_GPS_SIMULATOR=true` **at build time** shows the "Simulated" GPS
  mode and its D-pad. `NEXT_PUBLIC_*` values are baked into the build.
- `postinstall` runs `scripts/copy-vad-assets.mjs`, copying the VAD worklet,
  Silero model and onnxruntime WASM into `public/vad` (gitignored).
- GPS and the microphone need a secure context: `localhost` or HTTPS.

Production build and deploy (verified 2026-10-19: build passes; both guidance
e2e specs pass against it):

- Build with the deploy's public env set: `NEXT_PUBLIC_PAYLOAD_URL=<https url>`,
  `NEXT_PUBLIC_GPS_SIMULATOR=true` (demo), then `pnpm build`. Don't run `next dev`
  at the same time: both write `.next/dev/types`, which the build typechecks.
- `output: 'standalone'`: run `node .next/standalone/server.js` after
  `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`
  (`public/` carries `public/vad`). `next start` also works locally but warns.
- `next.config.ts` lists Payload's server packages in `serverExternalPackages`,
  as `withPayload` does in dev; bundling them broke `payload.config.ts` while
  collecting page data. `@pascal-app/editor` has a pnpm patch with typing fixes
  (`patches/@pascal-app__editor.patch`) and `src/types/pascal-editor-deps.d.ts`
  declares its untyped imports, because Next typechecks Pascal's shipped source.

Stories: `DirectionsBar`, `GpsSimulator`, `NavigationSpotlight`, `Assistant/Orb`,
and `TourNavigation` `RouteDirections` / `NearbySuggestion` / `AssistantOff`
(the route mock has two zones, _West hall_ and _East hall_). Unit tests:
`tests/int/tour-guidance.int.spec.ts` (realistic fixture museum). Full flow on the
real app: `tests/e2e/tour-guidance.e2e.spec.ts` (simulated GPS → step → suggestion)
and `tests/e2e/voice-assistant.e2e.spec.ts` (a WAV as the microphone → command);
see `tests/e2e/README.tour-navigation.md`. Storybook's map stories need a GPU and
are tagged `!test`; Storybook proxies `/api/assistant` and `/api/speech` to a local
`pnpm dev` so the orb can be tried there too.

## Generated texts, planned tours and museum mode

The visitor never sees a prompt or the word "AI": every feature below is a
button, a form or a voice command, and generated items differ from authored
ones only in their metadata (`generation` groups).

- **Tell me more / Curiosities / Its story** (`ContentExpansion`, in the
  content, step and object modals): `?more=<angle>` on the modal URL.
  `/api/expand` reads the original as the visitor (a locked paid body gets
  nothing), adds facts from Wikidata (Wikimedia Deutschland's hosted MCP
  server) and Wikipedia in the visitor's language (`expansion-sources.ts`),
  streams one model call (`expansion-prompt.ts`) and saves the result as a
  `contentVariants` document (Lexical, one locale per language). The text
  appears one paragraph at a time and is read aloud when the assistant is on
  (one shared speech player, `speech-context.tsx`). Links are
  `[name](/object/ID)` to entities of the same museum only (`expansion.ts`).
- **Simpler / Shorter / For children** (`ContentVersion`): `?level=`,
  `?minutes=`, `?audience=children` replace the body with a saved or newly
  written version (`contentVariants`, kind `version`). `audience=children` is
  a navigation key, so a family tour keeps it on every stop.
- Both are also voice/Spotlight commands while a modal is open
  (`navigation-commands.ts`: `more:*`, `version:*`).
- **Plan my visit** (`/[lng]/tour/plan`, linked from the navigator home):
  time, first or returning visit, adults and children's ages, interests (typed
  or dictated through `/api/transcribe`), wheelchair. `/api/plan-tour` picks
  the museum from the interests when none is chosen, lets the model choose
  free content IDs, keeps what fits the time (`tour-plan.ts`), orders stops by
  nearest room (`tour-order.ts`) and saves an ordinary tour with
  `generation.generated` and a hash of the answers, reused for identical ones.
- **Museum mode** (`MuseumSwitch` in the tabs layout, `museum-mode.ts`): a
  cookie locks the app to one museum; search pages and the plan form follow
  it. "Import a config file" accepts a museum exported from the Payload admin
  (import/export plugin, JSON or CSV, `museum-config.ts`).

Checks: `tests/int/expansion|tour-order|museum-config.int.spec.ts` and the
real-app flows in `tests/e2e/content-expansion.e2e.spec.ts`.

## Local fixture and focused checks

See [test instructions](../tests/e2e/README.tour-navigation.md) for commands.
`scripts/seed-tour-navigation.ts` creates/reuses `[DEV] Tour navigation` records:
two ordered contents, one side content, three placed objects, a room and saved
navmesh. It suppresses Mint generation and does not change unrelated museums.
It writes IDs and the URL to ignored `.e2e-fixtures/tour-navigation-fixture.json`.
Read that manifest instead of hardcoding IDs in tests or assuming every DB has it.

The current fixture uses an absolute localhost GLTF URL: Pascal resolves relative
catalog asset URLs against its own asset origin. Its Avatar GLTF is only a fixture
item; Pascal's batching renders this skinned model imperfectly. The separate
position avatar is rendered through Drei Clone.

Relevant tests:

- `tests/int/navMesh.int.spec.ts`: world transforms and complete/disconnected paths.
- `tests/int/tour-navigation.int.spec.ts`: cursor, content routing, URL safety/state,
  and object ID/category identification.
- `tests/e2e/tour-navigation.e2e.spec.ts`: default map,
  independent exploration, position reload and progression.
- `tests/e2e/tour-qr.e2e.spec.ts`: actual decoder with a generated QR supplied through
  a canvas camera stream; canonical object/content requests, contextual modal and reload.
  The camera is simulated, not the decoder. It does not require physical webcam access.

Use `PLAYWRIGHT_CHANNEL=chrome` if Playwright's pinned Chromium is unavailable,
and `PLAYWRIGHT_USE_RUNNING_SERVER=true` to use an existing Next server.
Do not start duplicate servers or kill unrelated processes.

## Verification status and next work

Evidence accumulated before this handoff:

- 11 focused integration tests passed.
- Manual browser checks passed: search, side content without advancement, explicit
  position, reload, both ordered stops and completion; actual model picking opened
  the matching object and wall clicks did not open details.
- The path and resized avatar were visually checked without WebGPU material errors.
- Full automated progression and QR E2E runs are **not yet green**. Prior runs hit
  slow cold compilations and stale Turbopack module-factory errors. The duplicate
  ancestor interceptor was removed. The QR test now separately observes the
  canonical request to distinguish decoding failure from routing failure.
- Final project `tsc --noEmit --pretty false` was rerun after seed fixes and
  `next typegen`: no diagnostics remained in the new seed/navigation/tests or
  generated route types. The command still exits nonzero for existing Pascal
  package source errors and unrelated app components. See local ignored
  `test-results/tour-navigation-typecheck.log`; do not claim a green project check.
- Storybook MCP test runs previously failed to start the runner. Manual Storybook
  checks are not substitutes for a passing automated run.
- Explicit alternative-destination/reset behavior needs browser coverage.
  Also audit how localized RSC reads expose translation refresh status; the helper
  currently returns the document and does not add a client translation polling UI.

On resumption, prioritize one QR case on a fresh development runtime, then fix
only demonstrated feature failures. Avoid broad unrelated cleanup.

## Environment pitfalls

- This Windows development machine ran low on RAM (about 500 MB free with several
  heavy checks). Run project typecheck and browser/Next compilation sequentially.
  Cold Next routes have taken multiple minutes; do not attribute every timeout to
  a scanner defect, or keep retrying the same expensive checks without diagnosis.
- A canonical request after scanning proves decoding happened; it does not prove
  the contextual modal opened. Inspect both stages and final UI.
- Real `getUserMedia` needs permission and a secure context. `localhost` is allowed;
  a phone visiting plain HTTP on a LAN IP generally needs HTTPS instead.
- Local LiveKit connection failures have
  appeared during testing. Report relevant effects without treating them as proof
  of QR failure. Never copy environment secrets or credentials into documentation.
- If route changes leave stale generated references, regenerate types. If HMR
  reports a missing module factory, restart the owned development process before
  changing application logic or deleting caches.
