# Tour navigation: implementation and agent handoff

Last reviewed: 2026-10-18. This document describes the working tree, including
uncommitted changes. Check source and Git status before resuming; local process IDs
and cached build artifacts are not reliable handoff state.

## Agreed product behavior

- Desktop and mobile use the same ordinary map view.
- Logistic directions (course specification: not items, not part of one) come
  from the tour's author: `tours.logistics` (entrance, tickets, cloakroom) and
  `tours.directions` (per stop, how to reach it from the previous one).
  `LogisticNotes` shows them in the tour header for the stop ahead, beside the
  map's computed route, unless the visitor chose another destination; the
  voice assistant gets them as context. The tour page shows them too
  (`src/lib/tour-logistics.ts`).
- The avatar marks the visitor's explicitly confirmed position. Opening a QR link
  or reading content must not change that position.
- Tour contents retain their original order. The cursor counts completed contents:
  `0` means the first content is next; `contents.length` means tour completed.
- Objects and contents outside the next tour stop can be explored independently.
  Only the expected next content opens the `open` modal with the advance action.
- A visitor can explicitly choose an object (including a content's associated
  object) as their position or as an alternative destination.
- Advancing confirms the completed stop as the position (`at` becomes its object,
  so heading to stop 5 shows the avatar at stop 4) and clears the alternative
  destination; a stop about no object keeps the previous position. Skipping
  unavailable stops keeps position. Resuming the tour route also clears that
  destination without advancing the cursor.
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
- Printed codes: museum staff (curator or director, `staffMuseumId` in
  `src/lib/qr-museum.ts`) get downloads in `QrCodeButton` (SVG, PNG) and a
  printable PDF (`/api/qr-sheet`: one A5 page, or every object of a museum as
  A4 labels; react-pdf, Noto Sans for all 24 languages, error correction Q).
  Those codes end with `?museum=<id>`: `src/proxy.ts` sets the museum-mode
  cookie and redirects to the plain URL, so whoever scans one on site gets the
  app in that museum. Codes shown on screen stay plain; opened from outside the
  app, a page of another museum only offers the switch (`MuseumModeOffer`).

Desktop (≥ Mantine `md`, 62em; `museum/[id]/navigation/navigation-desktop.module.css`):
the same routes and close/guest rules, recomposed. Contextual content, object and step
modals (`NavigationModal`) dock as a right-side panel between the header (its height is
published as `--navigation-header-height` by `TourNavigation`) and the navigation bar,
with no dimming, no scroll lock and a `slide-left` entrance, so the map stays
draggable; `SkippedStopModal` stays centered. Controls cluster bottom-left on desktop
and centre on phones. The directions strip is capped at 40rem and the header
column at 75rem with the stepper centered. Spotlight opens with mod+K or `/`.
The site header hides on map URLs but stays on a tour's start page.

The overlay uses the measured header and footer heights rather than a fixed
vertical offset. The footer grows with wrapped directions; the assistant uses
its intrinsic width. Active directions use a font-relative container layout:
when narrow, the complete instruction sits above the arrows and assistant
instead of being squeezed between them. Services, Scan, Search and guidance settings occupy a
persistent wrapping dock. Placed services, the nearest exit and the optional
wheelchair route live in a keyboard-accessible Services popover; choosing an
active destination resumes the tour. The popover closes on selection or Escape.
Simulator, proximity notices and tour shortcuts share the remaining scrollable
column. Only an overflowing column owns pan gestures; empty map space stays
draggable. Actions and stepper controls have minimum 44px targets; long labels
wrap. Duration badges and the next-stop action use the deeper museum shade
with automatic foreground contrast. These refinements are navigation-specific.

## URL and route contract

Base: `/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]` (`id` is the
museum, `tourId` the tour). Tours live inside their museum's navigation so one
persistent shell serves free navigation and every tour of the museum: starting
a tour from the free map only changes the URL and the map stays mounted.

| State                                 | Location                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tour start page (no map yet)          | `/[lng]/museum/[id]/navigation/tour/[tourId]`                                                  |
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
next-content routing, and museum object identification. Build tour URLs with
`tourStartPath(lng, museumId, tourId)` / `tourNavigationPath(lng, museumId, tourId, step)`
(`tourMuseumId(tour)` reads the id from a populated or unpopulated relationship);
`navigationBasePath`, `navigationContentPath`, `tourContentPath` and
`tourAdvanceHref` take tours with their `museum`. `at`, `to`, and the optional
wheelchair profile are forwarded between canonical and contextual routes.

**Old URLs.** The pre-phase-2 shape `/[lng]/tour/[id]/navigation[/...]` (printed
QR codes, shared links, bookmarks, a group host on an older client) answers a
**308** from the route handler `tour/[id]/navigation/[[...rest]]/route.ts`: it
looks up the tour's museum and keeps the rest of the path (step, `/open`,
`/content/ID`, `/object/ID`, `/scan`) and the whole query. A `next.config`
redirect cannot do this (it cannot know the museum); the temporary
museum-to-tour redirect that glued phase 1 is gone. Unknown tours answer 404.

The museum navigation layout owns `TourNavigationShell`, so the map survives
modal, step and tour transitions. A layout cannot read the `[tourId]` below it,
so it loads **all** the museum's tours (`getMuseumNavigationTours`) and the shell
picks the one in the URL (a tour created after the layout rendered triggers one
`router.refresh()`); `tour/[tourId]/layout.tsx` 404s a tour of another museum.
The shell shares the tour/catalog and map-derived placed IDs with the parallel
modal slots. Client components read `lng`, `id` (museum), `tourId`, `stepId`,
`at`, and `to` directly with Next's route and search hooks; there is no URL
state context to keep synchronized.

**One interceptor per canonical route.** Interception rewrites match the
intercepting route _and all its descendants_, so an interceptor in the tour
tree would compete with the free map's for the same URL. The museum navigation
`@modal/(...)[lng]/content/[contentId]` and `@modal/(...)[lng]/object/[objectId]`
are the only ones: they read the page being left from the `Next-Url` header
(`navigationModalTarget` in `navigation/intercept.ts`) and redirect into the
contextual URL of that map (a tour's next stop as `/open`). The museum details
page's `@object` interceptor (`museum/[id]/(details)`) sits on `/museum/[id]` and
therefore also matches navigation URLs, and Next tried it first in practice: it
uses the same helper to redirect into the map, but rendering its branch first
remounts the map. So in-app producers go straight to contextual URLs instead of
canonical ones: the scanner (`QrScanPage`), Spotlight commands, object actions
and `ExpansionText` links. The explicit contextual pages handle reloads. Null
default, base, and catch-all modal pages clear the slots on dismissal/navigation
(the free `@modal/[...catchAll]` is what the free slot shows on tour URLs).

The obsolete ancestor `tour/[id]/@step` slot and its slot-only parent layout were
removed: they intercepted the same content and caused compilation failures.
Do not restore a second interceptor for the same canonical route. After changing
route topology, run `pnpm exec next typegen` to refresh generated route types.
Read the installed Next guides in `node_modules/next/dist/docs/` for route changes.

## Free navigation (no tour)

Base: `/[lng]/museum/[id]/navigation`. The same persistent shell (no `tourId` in
the URL) and the same URL keys (`at`, `to`, `mobility`, `service`, `exit`,
`audience`); there is no cursor, no `/open` and no quiz.
`src/lib/tour-navigation.ts` exposes `NavigationScope`
(`{ kind: 'tour', tour, step }` / `{ kind: 'free', museumId }`) with
`navigationBasePath()` and `navigationContentPath()`; modal close, object
actions, scanner and commands derive "here" from it through
`useNavigationScope()`.

| State                    | Location                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Free map                 | `/[lng]/museum/[id]/navigation`                                                                           |
| Content / object (modal) | `…/navigation/content/ID`, `…/object/ID`                                                                  |
| Scanner                  | `…/navigation/scan`                                                                                       |
| Start one of its tours   | Spotlight `tour:ID` → `…/navigation/tour/ID/0`, keeping `at`, `mobility`, `audience` (same shell and map) |

- Entry points: "Explore the map" on the museum page, "Find it on the map" on
  a content page (opens `…/content/ID?to=OBJECT`), both from
  `src/lib/navigation-entry.ts` and offered only when the museum has a saved map.
- The museum detail page lives in the `museum/[id]/(details)` route group so its
  `@object` slot does not wrap the navigation tree (see the interceptor note above).
- Group tours stay tour-only: the host publishes only locations of the group's
  tour (`isTourLocation` in `src/lib/group.ts`, accepting the museum shape and
  the old `/tour/ID/…` one).

## Code map and reuse boundaries

All navigation paths below are relative to
`src/app/[lng]/(frontend)/museum/[id]/navigation/`. Map components live at its
root because free navigation and tours share them; the tour-only route files
live under `tour/[tourId]/`.

| File                                                                 | Responsibility                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `layout.tsx`, `TourNavigationShell.tsx`                              | Persistent map, museum tours, shared server data                 |
| `data.ts`                                                            | Cached museum/tour reads; museum tours; map catalog summaries    |
| `intercept.ts`                                                       | `Next-Url` → contextual modal URL for the canonical interceptors |
| `TourNavigation.tsx`                                                 | Composes map, controls, directions navbar, guidance and orb      |
| `MuseumMap.tsx`                                                      | Museum item clicks, avatar, destination and saved-navmesh route  |
| `NavigationObjectActions.tsx`                                        | Related content, explicit position/destination actions           |
| `NavigationModal.tsx`                                                | Shared contextual modal dismissal                                |
| `scan/QrScanPage.tsx`                                                | Allowed canonical QR paths, opened as contextual modals          |
| `tour/[tourId]/layout.tsx`, `page.tsx`                               | Tour belongs to this museum; start page                          |
| `tour/[tourId]/[stepId]/@modal/open/StepModal.tsx`                   | Next/complete action, moving `at` to the stop and clearing `to`  |
| `src/app/[lng]/(frontend)/tour/[id]/navigation/[[...rest]]/route.ts` | 308 from the old tour URLs                                       |

Other shared files:

- `src/components/pascal/MapViewer.tsx`: scene loading and readiness, fit bounds,
  custom selection-manager option, and orbit enablement. Pascal's plugins are
  loaded once per page by `loadMuseumPlugins()` (`src/lib/pascal/plugins.ts`),
  shared with the map editor: outside its dev mode Pascal throws on a plugin
  loaded twice, which blanked the map in production builds whenever the viewer
  got a new `map` object. `TourNavigationShell` also keeps the `museum` object
  stable while the document is unchanged (`useStableMuseum`: same id, `updatedAt` and name), because the server re-renders the
  layout on every Server Function call and on many navigations.
- `src/components/pascal/Avatar.tsx`: `AvatarMale.glb` (about 1.7 m, scale 1),
  cloned with `SkeletonUtils.clone` so it owns its bones; it turns to face the
  camera (`maath` `easing.dampAngle`), playing the in-place Walk clip slowed down
  while turning and Idle once facing the viewer. `dispose={null}` protects cached
  resources.
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

### Advanced localization and live proximity (2026-11-06)

GPS estimates now also work from a confirmed object in a free visit without a
selected destination. The estimate remains device-local: only explicit “I am
here” confirmation writes `at`, using the existing navigation URL helper.

`compass-source.ts` reads iOS `webkitCompassHeading` or absolute orientation
(`360 - alpha`). It never treats relative orientation as north. The visitor
enables it from Guidance settings; Safari permission is requested directly from
that tap. Missing/denied orientation falls back to choosing nearby works. After
8 seconds without readings, the old heading expires; GPS fixes expire after
15 seconds without updates and are cleared on errors or poor accuracy.

`NavigationProximity` combines `useRouteGuidance().estimate`, the placed works
from `museumRooms`, and `workInFront`. Enter within 3 m and 30°; an existing
candidate remains until beyond 4.5 m or 45°, reducing sensor flicker. Known rooms
filter out works across walls. At most four distinct works appear, with card-size
thumbnails from the navigation catalog (never full content bodies or full-size
images). These distances assume the existing north-up, metre-scaled museum plan.

The nonmodal `NearbyWorksNotice` distinguishes the requested next destination
(flag/filled action) from optional off-tour discoveries (compass/neutral action).
Discovery suggestions follow the existing Nearby suggestions setting; other
tour stops are not advertised as detours. Opening a work preserves the current
position; confirming explicitly recalibrates it. Dismissing keeps the current
candidates hidden until they leave range. Disabling GPS or losing a usable fix
withdraws the notice. Group guests do not get local position-changing notices.

In GPS mode, the old room notification is suppressed to avoid stacking two
suggestion systems; its history still supplies Nearby search pills. Without
GPS, room notifications retain their previous behavior. Simulator arrows both
walk and set the simulated heading to the movement's cardinal direction.

Validation: focused integration tests (`work-in-front`, `proximity-works`,
`compass-source`, `gps-localization`, `tour-guidance`), interactive Storybook
stories (`Nearby Works`, `Live Proximity`, `Compass Settings`), plus typecheck.
Browser tests may use an installed Chromium through
`PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium` if browser downloads are restricted.
Real indoor GPS precision and physical iOS/Android sensor behavior still need
device testing; synthetic sensor/browser tests do not certify that hardware.

### Existing guidance architecture

Added 2026-10-19. One idea ties these together: **every visitor action is a URL
command** (`navigation-commands.ts`). The Spotlight results, the
empty-Spotlight pills, the overlay buttons and the voice assistant all run the
same `NavigationCommand` (`router.replace` for URL state, `router.push` for modals).

| Piece              | Files                                                                          | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directions         | `src/lib/museum-rooms.ts`, `src/lib/tour-directions.ts`, `DirectionsBar.tsx`   | Route sampled every 0.5 m → room of each sample (Pascal `ZoneNode`) → a step per room change, naming the nearest `DoorNode` (≤ 2 m) and the turn from the angle between legs → arrival side. No AI; i18n templates; the first step has no turn because heading is unknown.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| GPS progress       | `src/lib/gps.ts`, `gps-source.ts`, `use-route-guidance.ts`, `GpsSimulator.tsx` | Anchor = confirmed start + the GPS fix taken there. Estimate = anchor + offset (equirectangular metres; map drawn north-up, north = −z). Snapped to the closest point on the route → step by distance walked. Fixes worse than 50 m are ignored. The estimate never writes `at`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Nearby suggestions | `src/lib/nearby-suggestions.ts`, `use-nearby-suggestions.tsx`                  | On entering a room, off-tour contents of that room's objects, once per visit, as one Mantine notification (top-center) with Open / Go there; also listed as "Nearby" pills. Paid locked contents show `LockedPriceBadge`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Voice assistant    | `src/components/assistant/*`, `src/app/api/assistant`, `src/app/api/speech`    | Tap the orb → one `MicVAD` from `@ricky0123/vad-web` (Silero VAD in the browser), created on the first tap and reused, closes the mic at the end of speech → `/api/assistant`: Groq Whisper transcript + one `generateText` with `Output.object({ reply, commandId })` restricted to the offered command ids → the browser runs the command; `/api/speech` (Fish Audio) speaks the reply. Plain JSON, no streaming. Before the model, the controlled vocabulary (`src/lib/voice-vocabulary.ts`, Italian and English fixed phrases: avanti/indietro, cos'è questo, dimmi di più/meno, non ho capito, troppo semplice, chi è l'autore, qual è lo stile, ci sono ostacoli, uscita, bagno, bar, negozio) runs its command directly. Every phrase has an on-screen pill: `previous-stop`, `what-is-this`, `author`/`style` (the work's Wikidata subjects, open `/subject/[id]`), `version:harder` ("More in depth"); "obstacles" turns on the step-free route, and the museum's declared accessibility is in the assistant's context. |
| Settings           | `GuidanceSettings.tsx`                                                         | Opt-in switches (assistant, spoken directions, suggestions) and GPS mode, in localStorage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

The catalog (`data.ts`) is read **as the viewer** so each content summary carries
`price` and a server-computed `locked`; the body never reaches the client.

Configuration:

- `GROQ_API_KEY`, `FISH_API_KEY` (server runtime env). Both AI routes have a
  per-IP in-memory limit (`src/lib/rate-limit.ts`).
- `NEXT_PUBLIC_GPS_SIMULATOR=true` **at build time** shows the "Simulated" GPS
  mode and its D-pad. `NEXT_PUBLIC_*` values are baked into the build.
- `postinstall` runs `scripts/copy-vad-assets.mjs`, copying the VAD worklet,
  Silero model and onnxruntime WASM into `public/vad` (gitignored), then
  `scripts/copy-zxing-assets.mjs`, copying the QR scanner's ZXing reader WASM
  into `public/zxing` (gitignored). Without a native `BarcodeDetector` (Chrome on
  Windows/Linux) the scanner loads it from there instead of a public CDN.
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
  "Tell me even more" continues the same angle (`?step=2`, up to
  `MAX_EXPANSION_STEPS`): the model gets the earlier steps as text the
  visitor has already read and adds only new information; each step is its
  own `contentVariants` document (`step`, lookup keys in
  `src/lib/expansion-variants.ts`). Asking the voice assistant again for the
  open angle goes one step further. A work with a `wikidataId` has its
  Wikidata statements read directly, without a name search.
- **Listen** (`ContentAudioButton`, beside the length in every content view):
  the base text read aloud in the page's language. `contentAudio` keeps one
  MP3 per content and locale with a `textHash` of the text it reads
  (`src/lib/content-audio.ts`). The `contents` hook `queueContentAudio`
  regenerates the English one when the title or text changes; other
  languages are generated on first listen, once the translation exists
  (`/api/content-audio/[id]`, statuses `ready`, `pending`, `translating`,
  `locked`, `unavailable`). Task `generateContentAudio` on queue `speech`
  (Fish Audio through AI SDK `generateSpeech`, long texts split by paragraph
  and joined); the source audio's real length replaces the estimated
  `durationSeconds`. The route reads the body as the visitor, so a locked paid
  content has no audio either. Needs `FISH_API_KEY`.
- **Simpler / Shorter / For children** (`ContentVersion`): `?level=`,
  `?seconds=` (half the original's length; the Spotlight command asks for 30),
  `?audience=children` replace the body with a saved or newly
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
  Family previews and group join offer a device-local adult/exact-age reader.
  `age` stays personal when following the host; versions and further
  explanations use separate age-specific caches. Budgets are strict, including
  the first stop. See [Planned visits](planned-visits.md) for the verified
  public/group flow and provider-testing boundary.
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
  a canvas camera stream; the scanner opens the scanned canonical object/content
  link straight as the tour's contextual modal (the poll waits for the URL to
  leave `/scan`), then reload.
  The camera is simulated, not the decoder. It does not require physical webcam access.

Use `PLAYWRIGHT_CHANNEL=chrome` if Playwright's pinned Chromium is unavailable,
and `PLAYWRIGHT_USE_RUNNING_SERVER=true` to use an existing Next server.
Do not start duplicate servers or kill unrelated processes.

## Historical verification at the original handoff

The following failures describe the original handoff, not the current branch.
Current closing evidence is in `docs/plan/requisiti-18-33.md`; production build,
TypeScript, navigation progression and both QR cases have since passed.

Evidence accumulated before that handoff:

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

That original QR-priority instruction is superseded by the current regression
record. Preserve the historical evidence without treating old failures as open tasks.

## Environment pitfalls

- This Windows development machine ran low on RAM (about 500 MB free with several
  heavy checks). Run project typecheck and browser/Next compilation sequentially.
  Cold Next routes have taken multiple minutes; do not attribute every timeout to
  a scanner defect, or keep retrying the same expensive checks without diagnosis.
- Inside a navigation the scanner no longer requests the canonical URL (it maps
  it to the contextual modal itself): leaving `/scan` proves decoding happened,
  not that the modal opened. Inspect both stages and final UI.
- Real `getUserMedia` needs permission and a secure context. `localhost` is allowed;
  a phone visiting plain HTTP on a LAN IP generally needs HTTPS instead.
- Local LiveKit connection failures have
  appeared during testing. Report relevant effects without treating them as proof
  of QR failure. Never copy environment secrets or credentials into documentation.
- If route changes leave stale generated references, regenerate types. If HMR
  reports a missing module factory, restart the owned development process before
  changing application logic or deleting caches.

## Local GLTF decoder (2026-11-07)

The editor regression exposed an uncaught request failure for Drei's default
Google-hosted Draco decoder. `src/lib/gltf-decoder.ts` now sets the documented
`useGLTF.setDecoderPath` before viewer/editor/model/Avatar preload. Postinstall
copies the matching JS/WASM trio already shipped by the installed Three package
into ignored `public/draco`; no decoder dependency or network exception is added.
Do not replace this with a test filter that suppresses runtime errors.

## Closing regression outcome (2026-11-07)

All 21 distinct browser scenarios are now covered by the complete run plus
focused reruns after fixes. Both QR cases use real generated camera frames and
the actual decoder, opening/reloading contextual object/content modals. Guidance
verifies that simulated GPS offers a nearby destination without changing `at`
until explicit confirmation. Voice uses the WAV microphone and AI SDK mocks.
Both editor cases pass with the local Draco decoder; all three group scenarios
pass with real LiveKit, including reconnect and failed/successful end recovery.
The public family flow includes separate age-version audio through the real
route/job/MongoDB/file pipeline. Current full integration count: 43 files,
276 tests; production build and TypeScript passed. i18next extraction `--ci`
passes. Lint has no errors, retaining warnings in pre-existing unrelated files.

This is functional regression evidence, not physical-device sensor acceptance or
live cartographic-provider verification. The visual-regression suite was not
run. See `docs/plan/requisiti-18-33.md` for the staged run evidence and the two
external acceptance boundaries.
