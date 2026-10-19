---
name: pascal-plugin-authoring
description: Use when working with the Pascal 3D editor libraries (@pascal-app/core, nodes, viewer, editor) in this project — authoring custom plugins, custom node kinds (NodeDefinition), geometry/system/renderer contributions, placement tools, floorplan builders, inspector extensions, or debugging MapViewer and museum-map loading. Trigger on mentions of pascal, @pascal-app, custom node kind, plugin, loadPlugin, builtinPlugin, scene registry, ParsedBuildJson, museum map, or any pascal-editor customization, even if the user doesn't say "plugin".
---

# Pascal Plugin Authoring

Pascal ships as versioned npm libraries (`@pascal-app/*` 1.0.x, source at
`github.com/pascalorg/editor`). The editor itself is data-driven: every
building primitive is a **node kind** contributed by a **plugin** through a
shared registry. Custom code follows the exact same shape as the built-ins —
there is no separate "extension SDK".

## Quick Reference

| Task | Solution | Details |
| ---- | -------- | ------- |
| Ship custom kinds | `Plugin` object + `loadPlugin()` | [plugin-authoring.md](reference/plugin-authoring.md#plugin-shape) |
| Define a node kind | `NodeDefinition` (schema + contributions) | [node-definition.md](reference/node-definition.md) |
| 3D look, no interactivity | `geometry(node, ctx)` pure builder | [node-definition.md](reference/node-definition.md#three-checkbox-model) |
| Per-frame behavior | `system: { module, priority }` | [node-definition.md](reference/node-definition.md#three-checkbox-model) |
| Placement / drag UX | `tool`, `affordanceTools`, `floorplanAffordances` | [node-definition.md](reference/node-definition.md#tools-and-affordances) |
| 2D plan rendering | `floorplan()`, `floorplanScope` | [node-definition.md](reference/node-definition.md#floorplan) |
| Inspector UI for a kind | `inspectorExtensions` on the plugin | [node-definition.md](reference/node-definition.md#inspector-extensions) |
| Load external plugins at boot | `setPluginDiscovery()` → `discoverPlugins()` | [plugin-authoring.md](reference/plugin-authoring.md#discovery) |
| Gate kinds per scene | `installedPlugins` in scene JSON | [plugin-authoring.md](reference/plugin-authoring.md#install-gate) |
| Render maps in this app | `MapViewer` pattern | [project-integration.md](reference/project-integration.md) |
| Validate incoming map JSON | `validateBuildJson()` | [project-integration.md](reference/project-integration.md) |
| New in 1.0.4 (`placementNotice`, `mechanism`, `batchable`, …) | version addendum | [v1.0.4.md](reference/v1.0.4.md) |

## Minimal Plugin

```ts
import type { Plugin } from '@pascal-app/core'
import { beaconDefinition } from './beacon/definition'

export const museumPlugin: Plugin = {
  id: 'artaround:museum-pack', // globally unique, never rename after shipping maps
  apiVersion: 1, // must be 1 — mismatch fails loadPlugin
  nodes: [beaconDefinition],
}

// Once at boot, before mounting <Viewer>:
await loadPlugin(builtinPlugin)
await loadPlugin(museumPlugin)
```

Rules: `loadPlugin` is **add-only** (no hot-remove), the registry **freezes**
after boot, and a **duplicate `kind` throws in production but only warns +
replaces under dev/HMR** (`[registry] duplicate node kind` vs `[registry]
re-registering node kind "…" (HMR)`). Copy an existing
small kind as scaffold — `shelf/` in `packages/nodes/src/` upstream is the
canonical minimal example (`schema`, `definition`, `geometry`, `floorplan`,
`tool`, `slots`, `paint`).

## Minimal Node Definition

```ts
import type { NodeDefinition } from '@pascal-app/core'
import { BeaconNode } from './schema' // Zod object; framework owns id/type
import { buildBeaconGeometry } from './geometry'

export const beaconDefinition: NodeDefinition<typeof BeaconNode> = {
  kind: 'beacon', // unique across ALL loaded plugins
  schemaVersion: 1, // bump when the schema shape changes
  schema: BeaconNode,
  category: '...', // NodeCategory — copy from a sibling kind
  defaults: () => ({ /* every field except id/type */ }),
  capabilities: { /* movable, selectable, duplicable, ... */ },
  geometry: buildBeaconGeometry, // pure: (node, ctx) => Object3D
}
```

`defaults()` returns `Omit<infer, 'id' | 'type'>` — never include those keys.

## Project Wiring (ArtAround)

- Museum maps are stored as Pascal JSON in `Museums.map`
  (`src/collections/Museums.ts:121`) and validated on read with
  `validateBuildJson()` (`TourNavigation.tsx:43`).
- `src/components/pascal/MapViewer.tsx` is the only renderer: loads
  `builtinPlugin`, parses each node with `AnyNode.parse()`, calls
  `setScene(nodes, rootNodeIds, { collections, materials, installedPlugins,
  hasExplicitPluginInstallState })`, then mounts `<Viewer>`.
- To show custom kinds in-app you must do **both**: `loadPlugin(customPlugin)`
  in `MapViewer` (or app bootstrap) **and** include the plugin id in the map's
  `installedPlugins`, or `isNodeKindEnabled()` hides the kind.
- Type fixtures live in `src/mocks/museum-map.mock.ts` and `museum.mock.ts`.

## Gotchas

1. **Load before mount.** No definitions in the registry → nodes cannot render;
   the viewer shows nothing and fails silently.
2. **Pure geometry.** `geometry(node, ctx)` must not read neighbours except via
   `ctx`; cross-sibling work (miters) goes in `computeLevelData`, and
   neighbour-dependent kinds must NOT set `geometryKey`.
3. **Unique kinds and plugin ids.** Both are global; renaming a plugin id
   orphans every persisted map that lists it in `installedPlugins`.
4. **v1 limits** (per upstream wiki — verify before designing around them): no
   custom materials, no floorplan primitives beyond `FloorplanGeometry`, no
   extending host stores (`useScene`/`useEditor`/`useViewer`), no custom routes.
5. **Peer stack is pinned**: React 18/19, `three ^0.186`, R3F v9, drei v10,
   Zod v4. New deps must not duplicate these.

## Reference Documentation

- **[plugin-authoring.md](reference/plugin-authoring.md)** — Plugin shape,
  `loadPlugin`, discovery, install gate, versioning.
- **[node-definition.md](reference/node-definition.md)** — Every
  `NodeDefinition` field: schema, three-checkbox model, floorplan, tools,
  capabilities, bake policy, inspector extensions.
- **[project-integration.md](reference/project-integration.md)** — How this repo
  wires the libraries: `MapViewer`, validation, mocks, adding a custom plugin
  to the app.
- **[v1.0.4.md](reference/v1.0.4.md)** — What 1.0.4 adds over 1.0.3: new
  `NodeDefinition` fields (`placementNotice`, `mechanism`, `batchable`,
  frozen `cuts`/`refs`/`assembly`), changed signatures (`ports`,
  `selectable`, `reconcile`, `collides`), new built-in kinds, recommended
  `defaults()` pattern.
