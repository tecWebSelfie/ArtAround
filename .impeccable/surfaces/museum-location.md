# Museum geographic location

Target: src/components/editing/forms/MuseumMetadataForm.tsx and the museum Info tab.
Mode: Operate for director editing; Read for the saved public location.
Visual authority: existing DESIGN.md, museum primary, Mantine fields and inline editing.

## Direction contract

THESIS: Search an address, inspect its position and save both together inside the existing museum form.
OWN-WORLD: Existing Mantine typography, spacing, light/dark surfaces and museum primary. No new visual identity; no third-party search widget styling.
STORY: The director selects an address suggestion. Its postal fields and geographic point become one draft. Visitors see the saved address and a bounded map without a GPS prompt. Manual coordinates are an explicit fallback.
FIRST VIEWPORT: Address search follows the existing metadata fields; the full address includes city and the map preview follows it. City is editable only inside manual location entry. Existing Save/Cancel stay at the end. The public map belongs to the Info address row.
FORM: Narrow extension of the established form, using Map Place's autocomplete hook, Mantine Combobox and standalone MapPlaceMap. No concept roll applies. seed: none (unavailable).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implementation record (2026-11-07)

- The build follows the direction above: `usePhotonAutocomplete` drives native
  Mantine `Combobox`/`TextInput`; standalone `MapPlaceMap` renders the shared
  public/draft map. The package's combined picker/search widget is unused.
- Postal fields and the native Payload longitude-first point are one draft and
  one Save update. Address, city and coordinate edits invalidate confirmation;
  selecting a suggestion or explicit manual confirmation restores it. Cancel
  discards the draft. New suggestions clear obsolete optional postal values.
- The map is bounded to 256 px, respects the app's light/dark scheme, has no GPS
  prompt and preserves a readable address with Retry/OpenStreetMap recovery.
  Its scoped CSS inherits Mantine font, border and radius. Existing `sm`/`xs`
  spacing and museum primary remain the visual authority; no global tokens added.
- No routing, indoor Pascal changes, production coordinate migration or publishing.

## Documentation and finish evidence

Current behavior/configuration: [Museum location](../../docs/museum-location.md).
The [library audit](../../docs/plan/museum-location-shape-and-library-audit.md)
now separates implemented architecture from historical alternatives.

Eight focused integration tests and all 14 scoped Storybook interaction/a11y
stories passed; no accessibility violations were reported in that story run.
TypeScript, scoped oxlint and i18next extraction `--ci` passed. Impeccable source
detection returned `[]`; this does not certify the whole application. Browser
stories use actual hook/WebGL behavior with fixture Photon/empty-background
basemap responses. Live street tiles/geocoder and physical devices are unverified.

Independent final visual verdict: **ship** for this scoped extension, with all
five contract sections and six valid final captures. No material fixes remain:
city confirmation, helper/error/status/link/Save contrast, marker semantics,
editor label and listbox status semantics are resolved. Public Info placement
was source-verified without a separate public-page capture; live providers,
street tiles and physical GPS were not tested. Development captures in
`.impeccable/review/museum-location/` are not shipping raster art. This is not
whole-application accessibility certification. Root `DESIGN.md`, `PRODUCT.md` and design sidecar
are preserved as an ordinary extension of the established world. The pre-existing
empty-theme description in DESIGN/sidecar contradicts the configured museum
primary and reduced motion; reported in the guide, not repaired or canonized.

## Full-address refinement (2026-11-07)

Distill removed the redundant normal City field; structured city remains derived
from suggestions and editable in the manual fallback. The provider full address
is saved, and legacy public addresses are completed without repeating city.
Polish inspected desktop, mobile and desktop-dark captures in
`.impeccable/review/museum-location-city/`; no horizontal overflow was measured.
Nine focused integration tests and 12 affected metadata/autocomplete interaction
/a11y stories passed without reported accessibility violations. TypeScript, scoped
lint and i18next extraction passed. These use fixture basemap/provider data; live
tile verification remains outside this evidence. The earlier independent ship
verdict applies to the initial extension, not a new independent review.
