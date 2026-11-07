# Museum geographic location

Implemented in the working tree on 2026-11-07. The museum Info tab shows the
saved address and a bounded map with one museum pin. Directors edit the address
and position inside the existing metadata section. Independent final visual
review returned **ship** for this scoped extension; this is not a deployment claim.

## Editing and persistence

`MuseumMetadataForm` keeps postal text and coordinates in a single draft.
Typing at least three characters starts autocomplete after a 300 ms debounce.
Selecting a result replaces address, city, region, postcode, country and point;
missing optional fields clear obsolete values from the previous selection.
The provider's full formatted address is retained, including the city. The normal
form has a single address input; structured city is derived from the selected
result for indexed search. City is editable only inside the manual-location
disclosure, including when a provider result lacks it. Country codes are uppercased.
`formatMuseumAddress` also completes legacy street-only addresses and avoids
repeating a city already present in the public address.

Changing address, manual city, longitude or latitude invalidates the point's
confirmation. A valid existing point begins confirmed. A new suggestion confirms
its point; the manual fallback requires valid coordinates and nonempty address
and city before “Confirm this location” is available. The preview can display an
unconfirmed draft point, accompanied by an explicit unconfirmed-position status.
Submitting an unconfirmed draft is blocked by validation and checked again at
the persistence boundary. The Save button itself need not become disabled.

Save sends metadata and the entire `location` group in one Payload SDK update.
Cancel discards the draft without saving. Existing director field access remains
the authorization boundary; the frontend form is not an access-control substitute.

The existing native Payload `point` is the only coordinate source:

```text
Payload SDK / REST: location.latlng = [9.1881, 45.4719]
MongoDB:            location.latlng = { type: "Point", coordinates: [9.1881, 45.4719] }
```

Order is always **longitude, latitude**. `isMuseumPoint` accepts two finite
numbers within longitude ±180 and latitude ±90. Empty manual fields are invalid;
`[0, 0]` is valid. Geographic degrees are separate from Pascal's local indoor
coordinates. No second GeoJSON field is added. `Museums.location.latlng` uses
`admin.hidden`, so the admin control is hidden while ordinary public museum
reads retain the point; broad `showHiddenFields` reads are unnecessary.

The reversed Milan coordinates in the mock were corrected. No production data
swap or migration was performed: individually verify legacy records, since a
reversed pair can still pass range validation.

## Components and service configuration

| Responsibility                                         | Source                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Native Mantine combobox over the Map Place Photon hook | `src/components/location/MuseumAddressAutocomplete.tsx`         |
| Point validation and selected-place normalization      | `src/lib/museum-location.ts`                                    |
| Atomic metadata draft, manual fallback and save        | `src/components/editing/forms/MuseumMetadataForm.tsx`           |
| Shared lazy client map / missing-point state           | `src/components/location/MuseumLocationMap.tsx`                 |
| Standalone `MapPlaceMap`, worker setup and recovery    | `src/components/location/MuseumLocationMapCanvas.tsx`           |
| Public Info address row                                | `src/app/[lng]/(frontend)/museum/[id]/(details)/MuseumPage.tsx` |
| Public coordinate visibility and director access       | `src/collections/Museums.ts`                                    |

The integration uses `@asammad48/react-map-place@0.1.0` with a pnpm patch.
Map Place owns autocomplete requests, debounce, cache and normalization;
Mantine owns the visible input, option list and feedback. The package's combined
picker/search widgets are not mounted. The headless approach was the user's
choice; earlier raw REST, vis.gl and Stadia proposals are historical comparisons
in the [library audit](plan/museum-location-shape-and-library-audit.md).

`NEXT_PUBLIC_PHOTON_ENDPOINT` overrides `https://photon.komoot.io`. This is a
browser-visible endpoint, not a secret. The default is a public demo service;
fixture verification does not establish its availability or production capacity.
No API keys are required by the implemented default. Search times out after
8 seconds. The public index's supported label languages are `en`, `de`, `fr`;
other interface languages request English labels. Provider errors explain that
search is unavailable and retain manual coordinates as the fallback.

Maps use CARTO Positron in light mode and Dark Matter in dark mode. They retain
the wrapper's attribution controls and use the museum primary for the pin.
There is no GPS request, current-location marker, map-click selection, marker
dragging, reverse-geocoding flow or outdoor route implementation. Indoor Pascal
maps and navigation are unaffected.

A missing/invalid point produces a text state instead of a canvas. Loading is
exposed through the map region's `aria-busy`. On map failure, the saved address
remains available, with Retry and an OpenStreetMap link. The external link is
also present after successful load. The canvas is client-only and 256 px high;
postal metadata can still render server-side.

`postinstall` runs `scripts/copy-maplibre-assets.mjs`, copying MapLibre 6's
`maplibre-gl-worker.mjs` and sibling `maplibre-gl-shared.mjs` to `public/maplibre`.
Both files are required because the worker imports its shared module. The map
sets its worker URL to `/maplibre/maplibre-gl-worker.mjs`. Generated assets are
gitignored; regenerate them through installation or the copy script when needed.

## Patch maintenance and visual system

`patches/@asammad48__react-map-place@0.1.0.patch` changes the package's ESM and
CommonJS distributions. The autocomplete fixes cover immediate cancellation and
stale-result suppression during debounce, repeated-query stability, option-aware
cache/request identity, the Photon `countrycode` parameter and recoverable
request timeout errors. Map markers receive `role="img"` alongside their label.
Recheck these behaviors before updating the package or dropping the patch.
Storybook excludes this package from Vite `optimizeDeps` to avoid reusing stale
pre-patch vendor code.

This is an extension of the existing Mantine world: system typography, `sm`/`xs`
stack spacing, default radius, semantic surfaces, museum primary and native
inline Save/Cancel. Scoped map CSS bridges the wrapper's font, border and radius
to Mantine. Address helper/error text uses readable theme values; metadata Save
opts into `FormActions`'s `autoContrast` and `museum.8` color. Other forms retain
their defaults. The shared `RichTextInput` label is associated with the editable
content. No new global design tokens or visual identity are introduced.

`PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json` remain the incumbent
authority. This documentation pass preserves them. Pre-existing system drift:
DESIGN's overview/extraction note and matching sidecar overview still describe
`src/theme.ts` as an empty `createTheme({})`, although it configures reduced
motion and the `museum` primary. Later DESIGN rules describe that primary. This
local extension does not resolve the older contradiction.

All 15 geographic-location UI keys are filled in all 24 supported locales; translation-status output still has pre-existing punctuation
and other-key warnings. Extraction `--ci` passing is not proof of complete
translation in all locales.

## Verification and limits

The initial implementation session reported eight passing tests in
`tests/int/museum-location.int.spec.tsx`. They exercise the installed patched
hook against MSW, not a replacement implementation: normalization, coordinate
validation, identical queries, stale responses, cache/options, timeouts and
provider recovery.

All 14 initial scoped Storybook interaction/accessibility stories passed, with no
accessibility violations reported: six metadata stories, five autocomplete
stories and three map stories. These cover keyboard selection, empty/error
states, combined save, blocked unconfirmed address/city edits, manual confirm,
Cancel, saved/missing points and map recovery. The raw MCP response is retained
at `/tmp/museum-location-audit/mcp-final-a11y.json` (an SSE transport capture,
despite its filename). TypeScript, scoped oxlint and i18next extraction `--ci`
also passed in the implementation session.

Impeccable detection returned `[]` in
`/tmp/museum-location-audit/impeccable-detect.json`. This scoped source scan is
not whole-application WCAG AA certification. Browser verification uses the real
hook and WebGL map with deterministic MSW Photon responses and an empty-background
basemap; live geocoder/street-tile readiness and physical devices remain untested.
No visual-regression suite was run for this extension.

Independent final visual review returned **ship**, with all five contract
sections and all six final captures valid. No material fixes remain for this
extension. City confirmation, helper/error/status/link/Save contrast, marker
semantics, editor label and listbox status semantics are resolved. Public Info
placement was verified in source; no separate public-page capture was reviewed.
Live providers, street tiles and physical GPS were not tested. This verdict is
scoped to the extension, not whole-application accessibility certification.
`.impeccable/review/museum-location/` captures are development-only evidence, not
shipping artwork. No generated shipping raster needs provenance. Nothing was
published by this work.

## Full-address refinement (2026-11-07)

Impeccable distill/polish removed the redundant City control from the normal
form and retained it under manual location entry. Full provider addresses and
legacy address formatting now share the public display without duplicating city.
Nine focused integration tests and all 12 affected metadata/autocomplete
interaction/a11y stories passed, with no reported accessibility violations.
TypeScript, scoped lint and i18next extraction `--ci` passed. Three final captures
(desktop, mobile and desktop dark) were inspected with no horizontal overflow;
they use the existing synthetic basemap and do not verify live street tiles.
Evidence: `/tmp/museum-location-audit/city-story-results.json` and
`.impeccable/review/museum-location-city/`. The independent ship verdict above
belongs to the initial extension; this refinement received local polish review.

Pre-push simplify/extract review retained the shared map and address formatter,
existing FormActions, reading-profile helpers and Mantine primitives. No further
pattern met the three-use/same-intent extraction threshold. DESIGN.md and its
sidecar now record the full-address/manual-city pattern; global tokens are unchanged.

## Live-provider network boundary (2026-11-07)

Fresh HTTPS probes to CARTO styles and Photon both received proxy CONNECT 403.
This is a cloud destination-policy denial, before the providers are reached.
A saved environment configuration draft now permits `basemaps.cartocdn.com`,
`*.basemaps.cartocdn.com`, `tiles.basemaps.cartocdn.com` and `photon.komoot.io`.
The draft requires review/save and environment publication to become effective;
no environment was published. After activation, verify both style JSON files,
their sprite/glyph/vector-tile requests, the visible street basemap and a real
Photon suggestion. Fixture map tests cannot certify live-provider readiness.

Final provider probes also returned CONNECT 403 for both CARTO styles and Photon;
receipt: `/tmp/artaround-live-map-probes.json`. All 15 location strings are now
translated across the 24 locales, with extraction `--ci` passing. The final
project-wide integration run passed 276 tests in 43 files; the geographic map
continues to use synthetic basemap responses in scoped UI verification.
