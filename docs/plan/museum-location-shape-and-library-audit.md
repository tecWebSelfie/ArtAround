# Museum location — Impeccable shape and library audit

Initial investigation: 2026-11-06. Implementation update: 2026-11-07.
Status: **implemented in the working tree; independent finish verdict: ship (scoped extension)**.
Scope: the public museum Info location and director inline metadata editing.
Indoor Pascal coordinates/navigation remain separate; outdoor routing is not implemented.

## Current recommendation and implementation

The user selected **Map Place hooks with native Mantine autocomplete UI**.
`MuseumAddressAutocomplete` uses `usePhotonAutocomplete` from the pinned,
locally patched `@asammad48/react-map-place@0.1.0`; Mantine `Combobox` and
`TextInput` own the field, options, keyboard selection and feedback. The same
package's standalone `MapPlaceMap` supplies the public and draft one-pin map.
The package's combined picker/search widgets are not used.

The [implementation guide](../museum-location.md) is authoritative for current
behavior, configuration, persistence, patch maintenance and verification limits.
The [widget customization assessment](map-place-customization-audit.md) remains
useful evidence that the package can be styled; it is not the selected integration.
The earlier raw REST, vis.gl and Stadia recommendations below are historical
alternatives, superseded by the user's hook + Mantine choice.

The metadata form commits selected postal text and the native Payload point in
one update. The normal form has one full-address input; city is derived from
the suggestion and remains editable only in the manual-location fallback. Legacy
street-only records are completed for display without duplicating city in full
addresses. Editing address, manual city or coordinates invalidates confirmation;
a suggestion selection or explicit manual confirmation restores it. Existing
`location.latlng` is `[longitude, latitude]` through the API and GeoJSON Point in
MongoDB. `admin.hidden` replaces field-level `hidden`, exposing normal public
museum coordinates without broad hidden-field serialization or a duplicate geometry.
The reversed Milan mock was corrected; production records were not migrated.

MapLibre's worker and shared module are copied to `public/maplibre` by
`postinstall`; generated output is ignored. Photon defaults to its public demo
endpoint and accepts `NEXT_PUBLIC_PHOTON_ENDPOINT`. Map styles now use
OpenFreeMap Bright/Dark endpoints (keyless public instance), replacing CARTO
after checking its current API-key requirement. No paid service configuration, GPS request,
outdoor routing or publication was added.

## Current verification and remaining boundaries

- Eight focused integration tests passed, exercising the actual patched hook
  with MSW plus coordinate validation and postal normalization.
- Fourteen scoped Storybook interaction/accessibility stories passed; no
  accessibility violations were reported in that run. Raw MCP transport capture:
  `/tmp/museum-location-audit/mcp-final-a11y.json`.
- TypeScript, scoped oxlint and i18next extraction `--ci` passed. English and
  Italian new keys are filled; other locales retain the project's fallback
  policy. Existing translation-status warnings remain outside this change.
- Impeccable source detection returned `[]` at
  `/tmp/museum-location-audit/impeccable-detect.json`. This is a scoped source
  result, not whole-application accessibility certification.
- Browser stories use real hook/WebGL behavior with deterministic MSW Photon
  responses and an empty-background basemap. They do not establish live public
  geocoder/street-tile readiness or physical-device behavior.
- Independent final visual review returned **ship**, with all five contract
  sections and six valid final captures; no material fixes remain for this
  extension. City confirmation, contrast, marker semantics, editor label and
  listbox status semantics are resolved. Public Info placement was source-verified
  without a separate public-page capture. Live providers, street tiles and
  physical GPS were not tested. Captures in
  `.impeccable/review/museum-location/` are development evidence, not shipping art.

## Historical investigation — superseded recommendations

Everything below records the earlier package/service investigation. References
such as “not implemented”, “current visibility gate”, “adopted alternatives”,
“pending questions” and implementation proposals describe that earlier state,
not the current working tree. Published-package findings concern the unpatched
0.1.0 release unless explicitly stated otherwise; selected integration defects
are addressed by the local patch documented in the implementation guide.

## Evidence and boundaries

The requested NPM web page returned HTTP 403. The review instead used the
**official NPM registry README, version metadata, integrity-verified published
tarball, declarations and original sources embedded in its source map**.
The package has no repository/homepage field in its published manifest;
no public project issue/test history was inferred from an unverified repository.
The README still uses the placeholder package name `@scope/react-map-place`.

Checked all 13 runtime exports, the 647-line declaration file, the complete
852-line registry README and the relevant published client/component/hook
sources. Compared them with the installed Mantine Map declarations/source,
its official registry README and the application's actual dependency versions.

Isolated checks, with no application dependency changes:

- Both packages import under the current Node/React installation.
- React Map Place renders its search-only component with React 19.2 server
  rendering. This does not prove React Server Component or browser-map support.
- Correct API samples for both libraries pass the project's TypeScript 7
  compiler with bundler resolution, including imports through the public package
  root in an isolated dependency directory. README examples with their imports
  corrected to the real package name produce seven diagnostics (below).
- Real local HTTP requests from `searchPlaces`/`reverseGeocode` verified their
  return shape and actual query parameters without consuming public services.
- A custom `SearchInput` slot was passed to the published picker and did not
  appear in its server-rendered output; the published source confirms why.
- Browser CSS inspection in dark OS mode measured the default focused input's
  light text on white background: approximately **1.28:1** contrast.
- Read-only MongoDB inspection confirmed native Payload GeoJSON storage and
  an existing example record with inverted coordinates.
- The current museum Info tab was inspected in Storybook at 390×844.

Raw evidence and scratch probes are retained locally under
`/tmp/museum-location-audit/`. No live Photon/OSRM routing test, full Next map
build, physical-device test or visual-regression suite was run. No package
installation, application implementation or publishing was performed.

## Existing application and data

- React/React DOM **19.2.6**, Next **16.4.2**, Mantine **9.6.3**, MapLibre
  **6.11.2**, Mantine Map **0.4.0**.
- Mantine Map and MapLibre are already dependencies, but no geographic-map
  component/import or worker setup was found in application source.
- Museum detail lives at `museum/[id]/(details)/MuseumPage.tsx`. The Info tab
  already renders description, address, email and accessibility metadata.
- Simple metadata uses inline `EditableSection` + `MuseumMetadataForm`, not a
  separate general museum-edit route. The existing `/edit/mapeditor` is the
  indoor building/map editor and is not the address editor.
- `Museums.location` already contains `address`, indexed `city`, optional
  `region`, `postalCode`, `country` and required hidden `latlng: point`.
- The metadata form edits address/city but explicitly preserves coordinates.
  Creation accepts manual longitude/latitude and browser geolocation.
- Metadata editing is director-only through existing field access. Curators
  retain their existing indoor-object-placement powers.

### GeoJSON: reuse the native point

Payload normally exposes a `point` as `[longitude, latitude]` in its API/SDK, but the
installed MongoDB adapter stores it as GeoJSON and creates a `2dsphere` index
by default. This was also checked against an actual local museum document.
Therefore the existing field can satisfy GeoJSON persistence without a second
geometry field that might disagree with it.

**Current visibility gate:** this particular point has field-level `hidden:
true`. Payload's afterRead hook removes hidden fields from normal responses;
the museum page does not request showHiddenFields. Its generated TypeScript
field alone is therefore not proof that the client receives the point. The
implementation must intentionally expose this public museum coordinate (for
example by replacing field-level hidden with admin-only hiding), or serialize
only a selected, safe location projection server-side. Never enable broad
hidden-field serialization for the whole museum just to display a marker.

Illustrative target shape after resolving visibility, using the existing demo
museum coordinates:

```text
Payload API / SDK:
location.address = "Via delle Belle Arti 56"
location.city = "Bologna"
location.latlng = [11.3524, 44.4972]

MongoDB:
location.latlng = {
  type: "Point",
  coordinates: [11.3524, 44.4972]
}
```

A map adapter can derive a GeoJSON Feature<Point> from that one point when
needed. If the requirement is explicitly a GeoJSON object in the REST response,
add a derived serialization, not an independently editable duplicate field.
Keep readable address text and searchable city in the existing fields;
normalize optional country/postcode/region from the selected result. Define
formatting once so city is not repeated when the provider's label is complete.

**Existing data needs review:** `src/mocks/museum.mock.ts` contains Milan as
`[45.4642, 9.19]`, and that ordering was found in a local example museum record.
Correct GeoJSON for Milan is approximately `[9.19, 45.4642]`. Other seed/create
paths already use longitude first. Do not swap every stored pair: both orders
can pass range validation and some records are already correct. Audit fixtures
and verify legacy museums individually, without geocoding every record on read.

## Compatibility and capability comparison

| Area                 | React Map Place 0.1.0                                                                                    | Mantine Map 0.4.0                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Peer compatibility   | React/DOM >=18; MapLibre >=4. Current versions satisfy ranges; developed against React 18 / MapLibre 4.5 | Mantine >=9; React/DOM ^19.2; depends on MapLibre ^6.1. Current versions match directly |
| NPM versions         | One published version, 0.1.0, 2026-08-14                                                                 | 0.4.0 latest; several recent pre-1.0 versions; not a claim of long production maturity  |
| Address autocomplete | Built-in Photon client, component and hook                                                               | No geocoding service; compose Mantine input with an adapter                             |
| Reverse geocoding    | Photon hook and imperative utility                                                                       | Separate adapter required                                                               |
| Public museum pin    | Standalone MapPlaceMap with marker support                                                               | Map + Marker; direct Mantine composition                                                |
| Correcting entrance  | Click/drag supported, but picker reverse-geocodes and replaces the exact point                           | Marker drag / map click expose coordinates directly                                     |
| Theme                | Separate rmp CSS, OS dark media, custom variables; integration work and dark-contrast defects            | Mantine theme/styles API; theme-aware light/dark map styles                             |
| Future outdoor route | OSRM distance, geometry and multi-stop hooks included                                                    | Draw a route with MapLibre source/layer through map context; routing service separate   |
| User geolocation     | useCurrentLocation; picker can request on mount with current-location origin                             | GeolocateControl requests on button click; location callback can feed a future route    |
| MapLibre 6 workers   | Not documented/configured by the wrapper; app must supply setup                                          | Explicit setWorkerUrl export and documented Next worker/shared-file setup               |
| CSS                  | Own stylesheet does not include MapLibre CSS                                                             | styles.css/styles.layer.css include MapLibre CSS                                        |
| Provider choice      | Configurable endpoints, but normalizers/contracts specifically Photon and OSRM                           | Map style provider independent; geocoder/router chosen separately                       |
| Maintenance boundary | More packaged functionality, plus fixes/adapters required                                                | Smaller UI responsibility; application owns thin service interfaces                     |

Neither React wrapper supplies a production geocoding, routing or tile service
merely by being installed. Both need a real map style, worker configuration,
attribution, loading/error handling and browser capability checks.

### Package-size observations, not application benchmarks

React Map Place's ESM file is 68,380 bytes (17,796 gzip) and its CSS 14,760
bytes (3,247 gzip), excluding MapLibre JS/CSS/workers. Mantine Map's ESM modules
total 24,385 bytes before bundling; its CSS is 71,039 bytes including MapLibre
styles. These are different artifact scopes, not directly comparable Next
bundle sizes. Both reuse the already-installed MapLibre; lazy-load the map
rather than shipping a renderer to every metadata reader immediately.

## Complete React Map Place runtime API inventory

| Export                  | Published behavior and relevance                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MapPlacePicker          | Discriminated place/distance/route modes; common controlled/uncontrolled selection and input, provider, map, callbacks, style/slot props. Relevant to edit, but controlled marker state and slots are problematic. |
| PlaceAutocomplete       | Standalone Photon combobox. ARIA/keyboard implementation exists; default UI strings are English and slots do not fully replace the input.                                                                          |
| MapPlaceMap             | Standalone MapLibre map: markers, clustering/spider layout, tooltip, styles, GeoJSON overlays, route/leg polylines, callbacks and imperative ref. Relevant to public display.                                      |
| usePhotonAutocomplete   | Query/setQuery, result list, loading/error and clearResults; debounce, cache and cancellation. Dynamic options/cache and country-filter concerns below.                                                            |
| usePhotonReverseGeocode | reverseGeocode(lat, lng), place/loading/error. Can resolve address labels, but preserve an explicitly chosen entrance point independently.                                                                         |
| useRoadDistance         | calculateDistance(origin, destination), result/loading/error. OSRM distance/duration; vehicle configuration can adjust duration.                                                                                   |
| useRouteGeometry        | calculateRoute, route/loading/error, clearRoute. GeoJSON LineString/Feature plus distance/duration; future outdoor route candidate.                                                                                |
| useCurrentLocation      | requestLocation(), coordinates/loading/error; a one-shot browser location, not continuous turn-by-turn navigation.                                                                                                 |
| useSearchHistory        | history/addToHistory/removeFromHistory/clearHistory; options maxItems and optional storageKey. No persistent history by default without a key. Not needed for one museum address.                                  |
| useMultiStopRoute       | calculateRoute(waypoints), route/loading/error, clearRoute; per-leg and total geometry/distance/duration. Not the README's calculateMultiStopRoute/result shape; no route optimization or live navigator promised. |
| searchPlaces            | Imperative search, returns PlaceResult[] with address and nested place. Suitable for a data adapter; country request parameter is currently wrong.                                                                 |
| reverseGeocode          | Imperative reverseGeocode(latitude, longitude, options?), returns PlaceResult or null. README object-argument example is wrong.                                                                                    |
| DEFAULT_MAP_STYLES      | Positron/CARTO and Liberty/Bright/Dark/OpenFreeMap choices. Separate from default demo style; provider terms still apply.                                                                                          |

### Public component prop surface reviewed

Common picker concerns:

- Services/search: photonEndpoint, osrmEndpoint, mapStyleUrl, language,
  countryCodes, searchLimit, minimumQueryLength, debounceMs, requestTimeoutMs,
  cacheTtlMs, locationBias, boundingBox, includeRawProviderData.
- Input/state: placeholder, disabled, required, autoFocus, value, defaultValue,
  inputValue, defaultInputValue, onInputValueChange, onValueChange, onInputChange.
- Map: showMap, mapHeight, initialCenter, initialZoom, selectedZoom,
  showDestinationMarker, showOriginMarker, allowMapClickSelection, allowMarkerDrag.
- Route display: showRouteSummary, routeColor, routeOutlineColor, routeWidth,
  routeOutlineWidth, routeOpacity, fitBoundsPadding.
- Integration: primaryColor, className, inputClassName, resultsClassName,
  mapClassName, components, onError, onLoadingChange; mode-specific onResult.
- Distance/route modes add origin, vehicleType, routingProfile, showPolyline.

MapPlaceMap adds direct center/zoom/styleUrl/height; markers/selectedMarkerId,
clusterRadius, showTooltip, showStyleSwitcher/styleSwitcherOptions;
originCoordinates/destinationCoordinates and visibility/drag flags;
routeGeojson/showPolyline and route styling; legRouteGeojsons; geojsonLayers;
renderClusterMarker/renderPinMarker/TooltipContent; onMarkerClick,
onClusterClick, onTooltipClose, onMapClick, onBoundsChange,
onDestinationMarkerDragEnd/onOriginMarkerDragEnd, onError/onLoadingChange.
Its ref exposes flyTo, fitBounds, getCenter, getZoom and getMap (typed unknown).

Slots declared: SearchInput, SearchResult, SearchResultsContainer,
LoadingIndicator, EmptyState, ErrorState, RouteSummary, OriginMarker,
DestinationMarker. The declaration is broader than the implementation's
actual slot wiring; see findings.

Result/type families reviewed:

- Coordinates, BoundingBox, FitBoundsPadding; MapPlace; PlaceResult;
  MarkerIcon, MapMarker, MapStyleOption, GeoJSONLayer.
- CommonPickerProps, PlaceModeProps, DistanceModeProps, RouteModeProps,
  MapPlacePickerMode/Props/Result, MapPlaceMapHandle, ComponentSlots.
- PlaceModeResult, DistanceModeResult, RouteModeResult, NormalizedRoute,
  RouteDistance, RouteDuration, RouteFeatureProperties, MultiStopLeg,
  MultiStopRouteResult.
- MapPlacePickerError/ErrorCode, LoadingState, SearchPlacesOptions,
  ReverseGeocodeOptions, UseMultiStopRouteOptions, UseSearchHistoryOptions/Result.
- Other hook/input/map prop interfaces occur in declarations but are not all
  exported for direct named import. Deriving props via React.ComponentProps
  or function Parameters can work around some missing named exports.

## Mantine Map API inventory

- Map: mapStyle URL/spec or light/dark pair; initialViewState, minZoom/maxZoom,
  interactive; onMapLoad/onMapClick/onMove/onMoveEnd; Mantine Box/styles props.
  initialViewState and interactive are initialization settings: changing them
  is not a controlled camera/interaction API. Use the ready map for camera moves.
- Marker / MapMarker: longitude/latitude, color, anchor, offset, draggable,
  onDragEnd, custom children; compose with Mantine Tooltip/Popover.
- Controls / MapControls: positions in four corners, children/styles.
- ControlGroup / MapControlGroup: horizontal/vertical grouping.
- ZoomInControl / ZoomOutControl: children, translated label, tooltipProps,
  withDisabledState and ActionIcon props.
- CompassControl: north reset, rotated supplied icon, label/tooltipProps.
- FullscreenControl: supplied icon or state render function; enterLabel/exitLabel.
- GeolocateControl: label, zoom, onLocate/onError; browser location on user action.
- Polygon / MapPolygon: coordinate ring, fill/outline colors/opacity/width,
  beforeId and pointer callbacks. A polygon is not a route polyline component.
- useMapContext: map/getMap, isLoaded, styleEpoch, root/fullscreen controls.
  useMapReady returns the typed ready MapLibre map. These support a future
  custom GeoJSON LineString source/layer and style-reload recovery.
- DEFAULT_MAP_STYLE, resolveStyle and setWorkerUrl; exported coordinate,
  camera, style, component-prop and polygon types.

No autocomplete, geocoding, distance, route solver, search history or
multi-stop service is exported. Those are deliberate integration responsibilities.

## Findings by severity

**P1 — Published documentation/API mismatch.** README imports VehicleType,
SearchInputSlotProps and SearchResultSlotProps that are not exported. It uses
calculateMultiStopRoute/result instead of calculateRoute/route, maxEntries
instead of maxItems, and the wrong reverseGeocode signature. Seven TypeScript
errors reproduced with the current compiler. Changelog date says 2024 while
registry publication is 2026; registry metadata is the release-date authority.

**P1 — Declared customization slots are not all wired.** PlaceAutocomplete
always renders its internal SearchInput. MapPlacePicker always renders its
internal RouteSummary; declared input/summary/marker slots are not consumed
there. The custom SearchInput probe rendered the built-in input instead.
This defeats the assumption that a Mantine input can simply be supplied as a
slot. The default input label/clear/result messages are not a ready 24-locale UI.

**P1 — Controlled picker selection can disagree with its map.** Internal
selectedPlace initializes from defaultValue, not value; there is no effect
synchronizing value into that map state. handlePlaceSelect prefers an existing
controlled value over the newly selected place. The input uses controlled value
while map coordinates use selectedPlace. A prefilled/editable museum needs a
proof or fix for this behavior; uncontrolled mode is a possible workaround,
not evidence that the advertised controlled mode is correct.

**P1, if precise entrance correction is required — Drag may replace the point.**
Picker click/drag reverse-geocodes the chosen coordinate and then selects the
returned feature's coordinates. These can be a building/street representative
point, not the entrance just chosen. Keep the director's exact coordinate and
use reverse geocoding only to suggest address text.

**P1 — Country filtering uses the wrong Photon parameter.** Published client
sends countrycodes=IT; official Photon API specifies repeatable countrycode.
The local HTTP probe confirms the emitted plural parameter. Do not assume the
country restriction is enforced; no request to the public service was needed
to demonstrate the protocol mismatch.

**P1 — Default dark UI can fail text contrast.** Published CSS combines dark
text color rgb(220,227,249) with a hard-coded white focused input surface.
Browser probe measured ~1.28:1, below 4.5:1. OS media-query theming also does
not automatically follow the app's Mantine theme selection. A default widget
adoption would require explicit theming/accessibility work.

**P2 — Several advertised defaults/behaviors drift.** Picker ignores its
selectedZoom prop; standalone map supports it. Route-mode showPolyline defaults
to false in the implementation, contrary to the README's true. LoadingState
sets search=false in picker; autocomplete search errors are not forwarded by
its onError collector. Timeout aborts are ignored as ordinary AbortError in
relevant hooks, so the advertised REQUEST_TIMEOUT is not reliably surfaced.
Dynamic autocomplete dependencies/cache omit options including bounding box
and bias; review those before making them editable controls.

**P2 — CSS/font and release provenance need attention.** Package CSS does not
include MapLibre CSS; it uses Material Symbols font-name glyphs without bundling
that font. README installation/import examples use the wrong placeholder scope.
No package repository/homepage is declared. These are integration/traceability
limitations, not a claim of malicious code or a completed vulnerability scan.

**Existing-app P1 — The point is hidden from ordinary reads.** The API field
visibility must be changed deliberately or a safe server projection provided;
otherwise the new map has no public coordinates even though MongoDB stores
GeoJSON. Required/generated types do not override hidden-field serialization.

**Shared integration gate — MapLibre 6 in Next.** Mantine Map documents worker
setup; React Map Place does not configure it. With the installed MapLibre 6.11.2,
configure the worker URL and ship its shared sibling, import the correct CSS,
keep the map in a client boundary and verify production build as well as dev.
Both import/typing smoke checks passed; no full browser-map compatibility pass
is claimed. React hooks cannot be called in React Server Components as the
React Map Place README suggests; only suitable imperative utilities may run
there. Plain SSR import safety is a different property.

**Shared service limitation — No-key does not mean unlimited service.** Photon
explicitly offers a public demo without availability guarantees and can throttle
or ban excessive traffic. The package itself describes default public services
as demo/low-traffic choices. A proxy/cache helps control usage but does not remove
provider limits or licensing/attribution requirements.

**Future routing limitation — Transport labels do not supply routing graphs.**
OSRM's profile is determined by data preprocessing. A walking URL/prop alone
does not make a car-backed demo service pedestrian-safe. Truck is implemented
as driving plus a duration multiplier, not truck clearance/weight restrictions.
Validate the chosen backend's real foot/accessibility support before showing
visitor routes. Neither library alone provides live turn-by-turn navigation,
offline maps or a guaranteed wheelchair-safe outdoor path.

## Shape proposal

Mode: **Operate** for director editing; **Read** for the public museum Info tab.
Preserve the existing Mantine visual system and inline metadata editing model.
This adds a local section, not a new museum-wide visual identity or editor.

### Public museum details

Add **Where to find us / Dove si trova** beside the existing address metadata
in Info: a bounded map with one museum marker and readable postal text outside
the canvas, rendering the address once rather than duplicating the existing
metadata row. Stack on phones; use the available reading column on desktop.
Do not displace the cover, name, tour content or indoor Explore the map action.

The address remains usable if WebGL/tiles fail. Avoid scroll-wheel/touch capture
while the visitor scrolls the page. Load the renderer on demand/near the section,
reserve its height and preserve map-provider attribution. No visitor GPS prompt
is needed just to display the museum.

### Director editing

Reuse the existing metadata editing entry. Inside it:

1. Labeled **Search address** field, searched after a short query/debounce;
   suggestions show street/number plus city/country so homonyms are clear.
2. Selecting one result fills the readable address and geographic point,
   recentres the map and displays the selected location for verification.
   Photon search already returns coordinates: do not add a redundant second
   forward-geocoding request for that same result.
3. Proposed optional **Adjust entrance** action allows a click or marker drag;
   retain that exact point even if reverse-geocoding suggests a nearby label.
   Offer a keyboard/text coordinate equivalent, not drag-only correction.
4. Existing Save/Cancel commits/reverts the metadata and position together.
   Typing a different query invalidates its unconfirmed selection; never save
   new address text silently paired with the previous point.

No implicit use of the director's current GPS as the museum's position. An
explicit optional locate action would be a convenience, not the default.
Changes remain drafts until Save. On failed save keep the draft for retry.

### States, existing records and consistency

- Initial/current location; searching; results; no result; selection preview;
  optional manual correction; dirty draft; saving; save failure.
- Existing metadata edits unrelated to address must not force re-geocoding.
- Legacy/provisional coordinates need a verification indication and targeted
  review; do not call every valid numeric point a confirmed entrance.
- Provider failure must not erase the last saved point/address. Define a manual
  address-plus-coordinate fallback with server validation if editing must work
  while the geocoder is down.
- Validate finite numbers, longitude/latitude ranges, correct coordinate order,
  required address/city and the coherent point/address change server-side.
- Persist only normalized location data and, if useful, small provenance fields;
  do not persist an entire provider response by default.
- Keep director-only access on the server. Public pages never expose edit tools.

### Technical shape, not yet implemented

- Client map: isolated Mantine Map/MapLibre boundary, explicit CSS and worker
  setup, ready/error boundary and text fallback. A read-only preview can use
  interactive=false; changing that prop later requires a deliberate lifecycle,
  as Mantine Map applies it only on mount.
- Address UI: Mantine Combobox with controlled query and selected result,
  translated labels/errors and keyboard/touch support.
- Service adapter: normalized place result and fixed provider configuration;
  bounded query/timeout, cancellation, cache keys including locale/filter/bias,
  and a same-origin server endpoint when appropriate. Do not accept an arbitrary
  provider URL from the browser.
- Persistence: existing Payload SDK update, existing location fields, one native
  point, intentional public coordinate visibility, atomic save. Reuse the same selector in museum creation later/in the
  same implementation scope to prevent two divergent location-entry flows.
- Future outdoor route: explicit **How to get here** action requests browser
  location on user intent, obtains a real walking route from a suitable backend,
  and draws its GeoJSON LineString on the same MapLibre engine. This is separate
  from the indoor Pascal map's local/metre coordinates and route mesh.

### Questions still pending

The user was asked asynchronously:

1. May the director correct the marker to the exact entrance, or must it stay at
   the selected address's geocoded point?
2. Is there a preferred/provider-key service, or should the proposal choose one?

Until answered, entrance correction and a provider-neutral Photon-first adapter
are **proposed defaults, not approved decisions**. No paid account, API key,
production endpoint or cloud-policy change is assumed.

### Implementation acceptance checks after direction confirmation

- One coherent address/point update; Cancel leaves the saved record unchanged.
- Reopened edit shows the saved marker; selecting another address moves it.
- Delayed/cancelled responses cannot restore an old selection; no silent mismatch.
- Correct city/country filters and address formatting; 24-locale UI strings.
- Readable light/dark map controls and labels, keyboard selection and accessible
  equivalent to marker drag, mobile scroll and enlarged text.
- Missing geocoder/tiles/WebGL shows recovery and preserves address/point.
- Director writes succeed; curator/anonymous writes are rejected server-side.
- Legacy data migration is selective; coordinate-order fixtures are corrected.
- Next dev and production build with actual MapLibre 6 worker files; geospatial
  queries and API/MongoDB representations are checked independently.
- Future routing is tested separately against a backend with an actual foot
  graph; no walking/accessibility claim based only on a UI transport selector.

## Primary references

- Requested package: https://www.npmjs.com/package/@asammad48/react-map-place?activeTab=versions
- Official package registry/README: https://registry.npmjs.org/@asammad48%2freact-map-place
- Verified release: https://registry.npmjs.org/@asammad48/react-map-place/-/react-map-place-0.1.0.tgz
- Mantine Map registry: https://registry.npmjs.org/mantine-map
- Mantine Map project: https://github.com/sarioglu/mantine-map
- Photon API: https://github.com/komoot/photon/blob/master/docs/api-v1.md
- Photon public demo policy: https://github.com/komoot/photon#demo-server
- OSRM profiles/API: https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md
- Project sources: `src/collections/Museums.ts`,
  `src/components/editing/forms/MuseumMetadataForm.tsx`, `MuseumCreateForm.tsx`,
  `src/app/[lng]/(frontend)/museum/[id]/(details)/MuseumPage.tsx`,
  installed `@payloadcms/db-mongodb/dist/models/buildSchema.js`,
  `payload/dist/fields/hooks/afterRead/promise.js`,
  installed `mantine-map/dist/types` and implementation, `package.json`.

## Follow-up: MapLibre GL Geocoder outside the map

The maintainer proposed the official MapLibre geocoder as the search UI:
https://github.com/maplibre/maplibre-gl-geocoder.

The official README explicitly supports **Usage without a Map** through
`geocoder.addTo(HTMLElementOrSelector)`. The integrity-verified published
`@maplibre/maplibre-gl-geocoder@1.9.4` source confirms that this mounts the input
with `onAdd()` and requires no MapLibre map instance for that path. Its declared
MapLibre peer range is >=4.0.0, satisfied by the project's 6.11.2; full Next/browser
integration remains to be checked. It is an imperative DOM control, not a React
or Mantine input component.

A viable revised proposal is:

- Mount the geocoder in a separate client-only container inside the metadata
  form, visually above the Mantine Map preview; do not use map.addControl.
- Supply `forwardGeocode`; optionally `getSuggestions`, `searchByPlaceId` and
  `reverseGeocode`. These are application/provider functions, not a bundled
  geocoding service. Adapt Photon/provider results to Carmen GeoJSON.
- Enable `showResultsWhileTyping` (default is false), with explicit minimum
  length/debounce. Choose a provider whose service supports autocomplete.
- Listen for `result`, normalize a Point geometry/center plus readable address,
  and update the React form's draft. That single draft drives Mantine Map.Marker
  and the existing Payload point. Handle clear/error explicitly.
- Keep marker/flyTo handling in the map wrapper (`marker:false`, `flyTo:false`
  on the external geocoder) to avoid competing state owners.
- Create/mount within a React client effect after the container exists; remove
  listeners and call onRemove on cleanup. The published cleanup handles the
  no-map case.
- Add the geocoder CSS and deliberately reconcile it with Mantine light/dark,
  sizing, labels, validation and keyboard behavior. External placement does not
  automatically turn its input into a Mantine TextInput.
- Initializing the form/map from the saved address/point remains independent of
  the search widget. Preserve the draft/confirmation rules from the shape.

This combination is a credible alternative to a custom Mantine Combobox for
phase one. The official outside-map mounting API avoids the earlier package's
unwired input slot. It still needs a provider adapter and visual/accessibility
checks, and it does not calculate the later visitor-to-museum route.
No application dependency or code change has been made by this follow-up.

## Adopted alternatives assessment: minimum integration code

### Decision and scope

The maintainer requested other libraries/methods and prioritized fewer lines of
application code while retaining Map Place capabilities and genuine Mantine UI.
They prefer no key but accept one when the benefit is substantial and a free plan
covers the university project. The selected architecture is vis.gl MapLibre +
Mantine + Geoapify REST, with no additional geocoder UI or routing SDK.
This updates the shape/technology choice; it does not represent completed museum
UI, an installed dependency, a configured service account or a tested deployment.
The existing application and its unrelated worktree changes remain untouched.

The criterion is code the application must own: provider normalization, React
state synchronization, imperative layer lifecycle, CSS overrides, accessibility
and error handling. A short happy-path snippet is not a complete implementation.
No complete competing app was built, so this is an API- and source-based effort
assessment, not a measured proof of a globally minimal line count.

### Alternatives inspected

Versions below are the official registry latest versions observed on 2026-11-06.
Published manifests, declarations and implementations were inspected where noted.

| Approach                                              | What it saves                                                                                   | What the app still owns                                                                                                | Decision                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Map Place 0.1.0 widgets                               | Combined picker and route/map behavior                                                          | Slot/controlled-state defects from the original audit; Mantine styling and provider bugs                               | Reject current widgets                                                          |
| Map Place 0.1.0 headless hooks                        | Existing autocomplete, reverse and route hooks                                                  | Dynamic search options/cache bugs, transport/profile correctness; map and Mantine UI                                   | Reject as the default; styling alone does not remove hook defects               |
| Mantine Map 0.4.0 + MapLibre Geocoder 1.9.4           | Existing map controls and external address widget                                               | Provider-to-Carmen adapter, imperative widget lifecycle, CSS/theme/validation integration, routing and layer lifecycle | Good simple map; not least glue for the complete feature set                    |
| Mantine Map + leaflet-geosearch 5.2.0 providers       | Headless forward/reverse Photon lookup with abort signals; `/providers` avoids Leaflet controls | Separate routing provider/client, route/clustering layers and lifecycle                                                | Best no-key candidate for a prototype, but two service contracts                |
| MapTiler client 3.1.0 / geocoding-control 3.1.0       | Typed geocoding services / ready input                                                          | Routing remains separate; input is not Mantine. Control declares MapLibre 5 peer while project has 6                   | Client viable for geocoding, control not selected                               |
| Geoapify autocomplete 3.1.0 / React wrapper 3.1.0     | Ready search dropdown, React 19 wrapper peer fits                                               | Own widget DOM/styles instead of Mantine; separate request logic still needed for routes                               | Use its underlying REST API instead                                             |
| Mapbox Search JS React 1.6.0                          | Ready search widgets / address components                                                       | Token, provider conditions, separate routing, non-Mantine widget integration                                           | More integration surfaces than needed                                           |
| Stadia Maps API 9.1.0                                 | Typed autocomplete, reverse and multimodal routing from one SDK                                 | Mantine UI, provider normalization/route handling and production account/domain authentication                         | Strong full-service alternative; free-plan scope not independently verified     |
| RoutingJS OSRM / Valhalla 0.3.0                       | Common directions client and geometry normalization                                             | Geocoder, authentication/hosting choice, UI. Published Valhalla example defaults to HTTP                               | Unnecessary extra client when the selected REST service already returns GeoJSON |
| vis.gl React MapLibre 8.1.3 + Geoapify REST + Mantine | Declarative marker, popup, source/layer lifecycle; one data provider; native Mantine UI         | Small shared fetch/validation boundary and domain-specific form logic                                                  | Adopt                                                                           |

The direct `@vis.gl/react-maplibre` package avoids installing the umbrella
`react-map-gl` package and its unused Mapbox wrapper. Its React/DOM >=16.3 and
MapLibre >=4 peer ranges cover installed React 19.2.6 and MapLibre 6.11.2. Its
published development manifest also targets MapLibre ^6.0.0. This is formal/source
compatibility evidence, not a completed Next/WebGL browser test.

### Full capability mapping — available building blocks, not shipped features

| Map Place capability                             | Selected equivalent                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Address search/autocomplete                      | Geoapify autocomplete REST + Mantine Combobox; returned Point already geocodes the selected address                                                                                  |
| Forward geocoding without suggestions            | Geoapify forward geocoding REST                                                                                                                                                      |
| Reverse geocoding                                | Geoapify reverse REST; do not overwrite exact entrance coordinates with the returned address point                                                                                   |
| Current user position                            | Existing browser Geolocation API / map GeolocateControl, only after an explicit action                                                                                               |
| Search debounce, cache, cancellation, errors     | Existing Mantine useDebouncedValue + TanStack Query AbortSignal/cache/error state; explicit timeout and HTTP status handling                                                         |
| Search history                                   | Existing Mantine useLocalStorage; bounded history, deduplication, clear action and malformed-storage handling                                                                        |
| Single/multiple markers, dragging and map clicks | vis.gl Marker/onDragEnd and Map pointer callbacks; Mantine content can be marker children                                                                                            |
| Selected marker tooltip / popover                | vis.gl Popup with Mantine content or a Mantine Popover anchor; synchronize selected id in React                                                                                      |
| Clustered markers and cluster expansion          | GeoJSON Source with cluster options + Layer and MapLibre cluster expansion API                                                                                                       |
| Spider layout for coincident markers             | Additional behavior, not built into Mantine Map or vis.gl; reuse a maintained spiderifier or implement/test a bounded overlap picker. Do not advertise this as automatically present |
| Style switcher and theme                         | Mantine Select/SegmentedControl selects mapStyle; Mantine color scheme drives light/dark style choice                                                                                |
| GeoJSON overlays                                 | Source + Layer, including Point, Polygon, LineString and MultiLineString                                                                                                             |
| Road distance and duration                       | Geoapify Routing feature properties distance/time; formatting with Intl, not straight-line distance                                                                                  |
| Route geometry and line rendering                | Geoapify Routing GeoJSON + Source/Layer, without encoded-polyline decoding                                                                                                           |
| Multiple stops and per-leg summaries             | Ordered routing waypoints + returned legs. Do not substitute optimized order unless the visitor requests it                                                                          |
| Travel/vehicle profiles                          | Provider-supported modes/options, including walking; do not simulate a profile by scaling driving duration                                                                           |
| Fly-to, fit bounds and map reference             | MapRef/useMap; expose only operations needed by callers                                                                                                                              |
| Combined search/distance/route picker modes      | Compose one controlled Mantine form around these shared primitives; no second internal selected-place state                                                                          |

This architecture can cover the feature set. It does not provide a ready-made
MapPlacePicker replacement: clustering UI, overlap selection, history UI and
route summaries still require application work. They should be introduced when
used, rather than prebuilding every demo option into the museum metadata form.
In particular, no route service replaces the indoor Pascal navigation engine.

### Why it reduces integration code

- Mantine owns the input, dropdown, labels, validation, loading/error UI, buttons,
  theme and responsive layout; no shadow widget or CSS bridge.
- vis.gl owns React lifecycle for Source, Layer, Marker and Popup. Mantine Map's
  currently published surface lacks Source/Layer/Popup, so the equivalent broader
  feature needs useMapReady/styleEpoch plus imperative add/update/remove logic.
- Geoapify returns GeoJSON and readable address properties. No Photon-to-Carmen
  adapter, no suggestions-to-place-id lookup chain and no polyline decoder.
- One shared request boundary serves autocomplete, forward/reverse geocoding and
  routing. The existing query library supplies caching and cancellation instead
  of adding another hook suite.
- Do not collapse meaningful error/consistency logic merely to lower a line count.
  Typed validation and atomic address/point saves are necessary in every option.

### Free-plan evidence and suitability

Geoapify's official published autocomplete README states: “Free Plan ... up to
3,000 address search requests per day.” Its official samples document 5 requests
per second for the free plan. That supports the address-editing use case of a
university demo. For example, 50 editing sessions with six debounced requests each
would use 300 address requests; this is an illustrative budget, not measured app
traffic. Each autocomplete request counts, not only the final selected address.

The network policy blocked geoapify.com, apidocs.geoapify.com and stadiamaps.com;
registry.npmjs.org and official GitHub samples were available. Consequently the
current full pricing table, routing credit multiplier, shared quota accounting,
free-tier terms and overage behavior could not be independently checked here.
Do not equate 3,000 address requests with 3,000 arbitrary routes or promise that
all traffic is free. Before enabling the later route UI, verify its cost in the
provider dashboard and keep the account on the free plan with a usage limit.
No paid plan, billing setup or external account has been created.

The saved museum location and displayed address must work without a provider key.
Autocomplete/reverse/routing are the only key-dependent operations; a missing key
must produce a clear unavailable state while preserving existing metadata. Keep
the provider behind a small boundary so Photon + a real foot-routing backend can
replace it if the free account's conditions prove unsuitable. For a browser key,
configure allowed origins; a server key stays server-only. Do not request keys in
chat or commit them. No live provider request with credentials was run.

### Integration order

1. Add the direct vis.gl MapLibre wrapper when implementing the museum screen;
   retain Mantine Map elsewhere and do not remove an existing dependency merely
   because this new surface uses a different wrapper.
2. Supply a shared typed REST request boundary (HTTP errors, empty results,
   AbortSignal/timeout, validated GeoJSON) and a project-configured Geoapify key.
3. Implement the existing inline director form using Mantine Combobox outside
   the map. Selection writes one draft address + [longitude, latitude]; editing
   the query invalidates an unconfirmed selection. Save/Cancel remain atomic.
4. Public Info displays a bounded one-pin map, readable saved address and map
   attribution without requesting visitor GPS. Expose only the public point as
   described in the existing Payload section, and verify legacy coordinate order.
5. Add route UI, history, clusters/overlap handling and richer overlays only on
   the surfaces that need them, with a real walking route and free-plan checks.

### Additional primary references

- vis.gl package: https://registry.npmjs.org/@vis.gl%2freact-maplibre
- vis.gl source: https://github.com/visgl/react-map-gl
- Leaflet GeoSearch providers: https://github.com/smeijer/leaflet-geosearch
- Geoapify published package/free-plan statement: https://www.npmjs.com/package/@geoapify/geocoder-autocomplete
- Geoapify official code samples: https://github.com/geoapify/maps-api-code-samples
- Stadia official SDK: https://github.com/stadiamaps/stadiamaps-api-ts
- MapTiler client: https://github.com/maptiler/maptiler-client-js
- MapTiler geocoding control: https://github.com/maptiler/maptiler-geocoding-control
- RoutingJS: https://github.com/gis-ops/routingjs

## Revision: SDK abstraction rather than raw REST (2026-11-07)

The previous decision overemphasized the absence of an additional SDK dependency
and undervalued the application code needed for query serialization, provider
parameters, response conversion and error handling. Native GeoJSON simplifies map
rendering but does not abstract the service client. Fewer imports is not the same
as fewer opportunities for request bugs.

Reinspection of the published Stadia Maps 9.1.0 declarations confirms real APIs:

```ts
import { Configuration, GeocodingApi, RoutingApi, CostingModel } from '@stadiamaps/api'

const config = new Configuration({ apiKey: serverKey })
const geocoding = new GeocodingApi(config)
const routing = new RoutingApi(config)

const addresses = await geocoding.autocomplete({ text: query }, { signal })
const address = await geocoding.reverse({ pointLat: latitude, pointLon: longitude })
const route = await routing.route({
  routeRequest: {
    locations: [origin, destination], // Each waypoint is { lat, lon }.
    costing: CostingModel.Pedestrian,
  },
})
```

The SDK owns endpoint selection, query/body serialization, authentication
attachment and modeled response conversion/error mechanisms. Types and required
argument checks are not full semantic runtime validation (e.g. all coordinate
ranges) or a promise of retry/debounce/cache behavior. The application still owns
handling failures, permission checks, exact entrance semantics, address/point
consistency and persistence. Route200Response is a union; do not assume any
response is directly a MapLibre GeoJSON Feature. Verify the selected format and
geometry normalization before promising an adapter-free map integration.

Use the existing useQuery around an SDK call for debounce/cache/cancellation
rather than inventing a provider-specific hook suite. Secret-key SDK instances
stay behind a server endpoint; browser calls require supported domain/public-key
authentication. Examples illustrate the service boundary, not a deployed client.

Map Place goes a level further with ready usePhotonAutocomplete,
usePhotonReverseGeocode, useRouteGeometry and useMultiStopRoute hooks. It can be
used headlessly alongside a Mantine UI: the unwired SearchInput slot does not
prevent using the exported hooks directly. However, the earlier audit found
headless defects too (country filter parameter, incomplete dynamic options/cache
keys and route profile assumptions), so it is not automatically the safer choice
without targeted fixes and tests. A maintained typed SDK plus the project's
existing query/hooks stack is the better abstraction baseline to validate next.

No claim is made that Stadia's current free plan satisfies the project: official
pricing remains inaccessible in this environment. The user's free-tier condition
is still binding; service adoption depends on verifying it. No paid account or
service configuration has been created.
