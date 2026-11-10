# Map Place customization and Mantine fit

Date: 2026-11-07. Scope: published `@asammad48/react-map-place@0.1.0`
components, their customization API and their visual fit with ArtAround's Mantine
theme. This is an assessment, not an application implementation or whole-library
production certification.

## Conclusion

**The components are customizable.** The earlier statement that the widgets could
not be adapted to Mantine was too broad. External CSS, actual CSS variables,
className hooks, some React slots and direct map render callbacks are available.
The observed slot defects do not prevent styling the existing input and dropdown.

In light mode the default appearance is broadly compatible with a conventional
form, although visibly different from this project's native Mantine fields.
Using the original CSS unchanged is not suitable for the project's dark theme:
focus forces a white input background while the OS-dark text remains pale.
A small scoped CSS bridge fixes the tested address search surfaces without
rewriting autocomplete, replacing its hooks or patching the published JavaScript.

Therefore **UI appearance alone is not a reason to reject Map Place**. Consider
its existing widgets plus a CSS bridge before replacing them with custom Mantine
widgets. Functional defects in controlled state, filtering and routing remain a
separate integration question, covered in the main library audit.

## Version and evidence

- Rechecked the official npm registry: latest is still 0.1.0, with no newer
  published version observed on 2026-11-07.
- Read the complete published stylesheet and declarations and rechecked component
  source recovered from the published source map; did not rely only on README.
- Started the existing Storybook and read `list-all-documentation` and
  `get-documentation` for `foundations-editor-mantine-apis--docs` over its MCP
  endpoint. Used the installed Mantine 9.6.3 components and the actual project
  `theme`/`cssVariablesResolver` in the comparison fixture.
- Bundled the unmodified published Map Place code and CSS in an isolated React
  19.2.6 fixture outside the application. Compared native Mantine TextInput,
  unmodified MapPlacePicker and the same picker with scoped CSS.
- Used Chromium via Playwright with deterministic Photon and OSRM responses
  intercepted through `page.route`. Tested actual typing, results, loading,
  empty/error states, selection and distance summary. No live service success
  or geocoding accuracy is claimed.
- Compared the four combinations of OS light/dark and forced app light/dark.
  Captured desktop and a 390px mobile viewport; the fixture had no horizontal
  overflow. This does not certify every map control or a physical touch device.
- No package was installed into the application; no production component,
  collection, dependency or deployment was changed. These are focused local
  browser probes, not the repository-wide visual-regression suite.

## Actual customization surface

| Mechanism                                | Verified status and limits                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External CSS                             | Available. Ordinary DOM and global `rmp-*` classes; no shadow-root boundary. Styles can be overridden after importing the published CSS. Some hard-coded colors need selector overrides, not just variable replacement.                                                                                                                                  |
| CSS variables                            | Available. Font, text/muted colors, surfaces, border, radius, focus/accent, hover/active backgrounds, spacing, shadows, marker/route colors. Actual names include `--rmp-focus-color` and `--rmp-text-color`.                                                                                                                                            |
| Class props                              | `className`, `inputClassName`, `resultsClassName`, `mapClassName` on the picker; appropriate subsets on standalone components. Browser verified the input class reaches the real input.                                                                                                                                                                  |
| `primaryColor`                           | Works on standalone PlaceAutocomplete. On MapPlacePicker, the prop is set on the outer root but not forwarded to the nested PlaceAutocomplete. That nested root defines its own default accent. Browser probe: standalone #e03131; nested picker input still #004ac6. Use scoped CSS on both roots or fix forwarding.                                    |
| Result/state React slots                 | `SearchResult`, `SearchResultsContainer`, `LoadingIndicator`, `EmptyState`, `ErrorState` executed in interactive browser probes. A custom result/container must preserve listbox semantics, option IDs and selection handlers.                                                                                                                           |
| Input/summary React slots                | `SearchInput` and `RouteSummary` are declared but not used by the relevant published render paths. Interactive probe confirmed custom components were not mounted; built-in input/summary remained. CSS adaptation still works.                                                                                                                          |
| Origin/destination React slots           | `OriginMarker` and `DestinationMarker` are declared but not consumed in the picker/map render paths examined. This conclusion is source-based; no WebGL marker-slot execution claim.                                                                                                                                                                     |
| Direct map customization                 | Standalone MapPlaceMap has wired `renderPinMarker` and `renderClusterMarker` callbacks returning HTMLElements, `TooltipContent` accepting a React component, and marker image icons. Verified declarations and source call sites; not exercised in this browser fixture. These extra direct map props are not automatically forwarded by MapPlacePicker. |
| Removing bundled CSS                     | Technically possible; the import is separate. This would require recreating layout and state styles too, and defeats the goal of avoiding UI work. Prefer overrides.                                                                                                                                                                                     |
| Mantine `styles`/`classNames`/`size` API | Not supported as native Mantine component props. The adaptation uses the library's own class hooks and stylesheet, not undocumented Mantine-style props.                                                                                                                                                                                                 |

The README's CSS example targets `.rmp-container` and `--rmp-primary`; the shipped
stylesheet instead uses `.rmp-picker` and `--rmp-focus-color` among others.
Copying that example does not theme the actual input. The README's “replace any
part” description also overstates the currently connected React slots.

## Default visual fit

| Aspect          | Mantine reference in this fixture                        | Published Map Place default                                                             |
| --------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Field height    | 36px at default size                                     | 48px                                                                                    |
| Input text      | 14px                                                     | 16px                                                                                    |
| Font            | Project Mantine system stack                             | Inter-first stack; Inter is not bundled                                                 |
| Accent          | Project museum primary, default #228be6                  | #004ac6; does not follow the museum palette automatically                               |
| Surface         | Mantine theme surface                                    | Blue-tinted surface at rest; white on focus                                             |
| Theme selection | `data-mantine-color-scheme`, including forced app choice | OS `prefers-color-scheme`; does not follow the app toggle                               |
| Icons           | Existing project icon system                             | Material Symbols pseudo-element ligatures; font is not bundled or loaded by the project |

Without the icon font, the actual comparison renders the words `search` and
`location_on`. These consume input/result width and contribute to truncated
suggestions. Loading the required font is one option; removing those pseudo-icons
and using the project's icons is another. The CSS-only probe removed them.
The probe also changed result-item layout from flex to block so name and address
stack instead of competing in a single row.

Measured focused input contrast:

| OS preference | App theme | Original                    | CSS-adapted field |
| ------------- | --------- | --------------------------- | ----------------- |
| Light         | Light     | 17.10:1                     | 21.00:1           |
| Dark          | Dark      | **1.28:1**                  | 8.20:1            |
| Dark          | Light     | **1.28:1**                  | 21.00:1           |
| Light         | Dark      | 17.10:1, but visually light | 8.20:1            |

The original dark text color is rgb(220, 227, 249) while the focused wrapper
background is rgb(255, 255, 255). The adapted dark field uses rgb(201, 201, 201)
on rgb(46, 46, 46). These are scoped input measurements, not an accessibility
score for the full library. Default dropdown surfaces and other map overlays also
contain hard-coded white backgrounds; a full map theme needs corresponding rules.

## CSS bridge demonstrated

The isolated address-field proof uses fewer than 50 nonblank CSS lines (including
comments) after fixture framing. It covers tokens, focused background, input
size, dropdown surface, pseudo-icons and result stacking. It is not a complete
map-control, tooltip, bottom-sheet and cluster stylesheet.

Usage needs only the existing component and a scoped class:

```tsx
import { MapPlacePicker } from '@asammad48/react-map-place'
import '@asammad48/react-map-place/styles'
import './map-place-mantine.css' // After the library stylesheet.

;<MapPlacePicker mode="place" className="mantine-map-place" />
```

The important part of the CSS is mapping both nested picker roots:

```css
.mantine-map-place.rmp-picker,
.mantine-map-place .rmp-picker {
  --rmp-font-family: var(--mantine-font-family);
  --rmp-text-color: var(--mantine-color-text);
  --rmp-muted-color: var(--mantine-color-dimmed);
  --rmp-border-color: var(--mantine-color-default-border);
  --rmp-border-radius: var(--mantine-radius-default);
  --rmp-focus-color: var(--mantine-primary-color-filled);
  --rmp-hover-bg: var(--mantine-color-default-hover);
  --rmp-active-bg: var(--mantine-primary-color-light);
}

.mantine-map-place .rmp-search-wrapper,
.mantine-map-place .rmp-search-wrapper:focus-within {
  background: var(--mantine-color-default);
}

.mantine-map-place .rmp-results {
  background: var(--mantine-color-body);
}
```

This excerpt illustrates the theme boundary; the proof includes additional size,
focus, icon and result-layout rules. A production integration still needs real
translated labels, form validation, disabled/error states and existing-record
behavior. The fixture's visual labels and synthetic museum are demonstration
content, not final application UI.

## Captures

Each desktop image shows native Mantine on the left, the published picker in the
middle, and the same picker with CSS overrides on the right.

- [Light comparison](assets/map-place-mantine-light.png)
- [Dark comparison](assets/map-place-mantine-dark.png)
- [Mobile comparison](assets/map-place-mantine-mobile.png)

Probe code and detailed browser measurements are in the current execution
workspace under `/tmp/museum-location-audit/customization/`; this temporary path
is not a permanent project dependency. The captures and this report retain the
review evidence in the repository.

## Integration judgment

The light theme is close enough in general visual language to keep the built-in
widgets, provided different field size is acceptable. Dark focus and missing
icon fonts are actual defects, not matters of taste, so keeping the original CSS
completely unchanged is unsuitable. A small adapter preserves the component's
behavior and makes the tested address UI coherent with Mantine.

A library fork is **not necessary for that styling task**. Targeted JavaScript
patches may still be needed for the already identified data/control issues; this
visual assessment neither clears nor broadens those findings. Avoid switching
providers or rebuilding autocomplete merely to solve colors and spacing.
