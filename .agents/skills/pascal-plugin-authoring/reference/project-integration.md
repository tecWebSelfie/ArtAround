# Project Integration (ArtAround)

## How This Repo Uses Pascal

| Layer | Location | Role |
| ----- | -------- | ---- |
| Storage | `src/collections/Museums.ts:121` | `map: json` — the Pascal scene JSON per museum |
| Validation | `TourNavigation.tsx:43` | `validateBuildJson()` on read |
| Rendering | `src/components/pascal/MapViewer.tsx` | loads plugin, `setScene`, mounts `<Viewer>` |
| Fixtures | `src/mocks/museum-map.mock.ts`, `museum.mock.ts` | typed `ParsedBuildJson` / node fixtures |

## MapViewer Pattern

`MapViewer` (`src/components/pascal/MapViewer.tsx`) is a `'use client'`
component taking `{ map: ParsedBuildJson }`:

1. `useEffect` → `await loadPlugin(builtinPlugin)` (bootstrap, once).
2. Parse every entry with `AnyNode.parse(value)` into
   `Record<AnyNodeId, AnyNode>`.
3. `setScene(nodes, map.rootNodeIds, { collections, materials,
   installedPlugins, hasExplicitPluginInstallState:
   map.installedPlugins !== undefined })`.
4. While loading show `Loading...`; on failure show `role="alert"` with the
   message.
5. Mounts `<Viewer onSceneReadyChange>` + drei `<CameraControls>`. On ready it
   frames all nodes **except `site`** (the horizon plane would push the
   camera to infinity): `Box3.expandByObject` per registered object →
   `fitToSphere(radius * 1.1)`.

Follow this exact sequence when adding a second renderer or preview surface.

## Adding a Custom Plugin to the App

Two changes, both required:

1. **Load it.** In `MapViewer` (or earlier app bootstrap, before any
   `<Viewer>` mounts):
   ```ts
   import { myPlugin } from '@/pascal-plugins/museum-pack'
   await loadPlugin(builtinPlugin)
   await loadPlugin(myPlugin)
   ```
   For dynamic packs prefer the discovery wiring (`setPluginDiscovery` →
   `discoverPlugins`, see plugin-authoring.md) over hardcoded imports.
2. **Declare it in maps.** Every scene JSON using custom kinds must list
   `"installedPlugins": ["vendor:pack"]`, or `isNodeKindEnabled()` hides
   those kinds at render. `validateBuildJson()` preserves the array.

Keep plugin code in one place (`src/pascal-plugins/<pack>/`: `index.ts`
exporting the `Plugin`, one folder per kind mirroring upstream
`packages/nodes/src/<kind>/`). Import node *schemas* from `@pascal-app/core`
when they exist there (e.g. `ShelfNode`); define new Zod schemas locally for
new kinds.

## Validation Contract

- `validateBuildJson(input)` returns a normalized `ParsedBuildJson`
  (`{ nodes, rootNodeIds, collections?, materials?, installedPlugins? }`) and
  warns — without failing — on malformed `installedPlugins`.
- Unknown node `type`s fail validation: the producing plugin must be loaded
  (or the map authored) with a matching kind. When tour navigation rejects a
  museum map, check kind coverage before touching the validator.
- Mocks must stay assignable to `ParsedBuildJson` — type fixtures, not `any`
  blobs. Import node types (`BuildingNode`, `LevelNode`, `SiteNode`,
  `WallNode`, …) from `@pascal-app/core`.

## Version Pins

Installed: `@pascal-app/core` 1.0.3, `nodes`/`viewer`/`editor` 1.0.3.
Peers: React 18/19, `three ^0.186`, `@react-three/fiber` v9, `drei` v10,
Zod v4 (`>=4.5.4 <4.6` for core). Do not add a second copy of these peers in
a plugin package — a plugin is source code in this repo, not a separate
npm package, precisely to avoid dual-React/dual-Three failures.
