# NodeDefinition Field Guide

Full type: `node_modules/@pascal-app/core/dist/registry/types.d.ts:876`.
Scaffold new kinds by copying `packages/nodes/src/shelf/` upstream
(small kind: `schema`, `definition`, `geometry`, `floorplan`,
`floorplan-affordances`, `floorplan-move`, `tool`, `slots`, `paint`,
`parametrics`). Complex kinds add `system`, `actions/`, `*-tool` files
(see `fence/`).

## Identity and Data

- `kind: string` — global id, e.g. `'shelf'`. Unique across all plugins.
- `schemaVersion: number` — bump on schema shape changes (see migrations in
  plugin-authoring.md).
- `schema: S extends ZodObject` — Zod v4 schema. Framework owns `id`/`type`.
- `defaults: () => Omit<infer, 'id' | 'type'>` — initial values for new
  instances. Never include `id`/`type`.
- `category: NodeCategory` — catalog grouping; copy from a sibling kind.
- `extensions?: Record<string, unknown>` — opaque host/plugin data, stored
  but never interpreted by core. Custom metadata goes here, not in ad-hoc
  top-level fields.

## Three-Checkbox Model

`geometry`, `renderer`, `system` are independent — combine as needed:

- **`geometry?: (node, ctx) => Object3D`** — pure builder. The generic
  `<GeometrySystem>` calls it on every dirty mark and swaps the group's
  children. `ctx` gives read-only scene access (`resolve`, `children`,
  `siblings`, `parent`). This alone suffices for static parametric kinds —
  no `renderer.tsx`/`system.tsx` needed. Pair with `<ParametricNodeRenderer>`
  when you also want JSX composition.
- **`renderer?: RendererSource`** — custom React renderer. Shapes:
  `{ kind: 'parametric', module }` (lazy component receiving `{ node }`),
  `{ kind: 'glb', getAsset }`, `{ kind: 'instanced-glb', getAsset }`.
  Needed for JSX-only features (`<Html>`, `useGLTF`, drei helpers).
- **`system?: { module, priority? }`** — lazy component receiving
  `{ sceneApi }` for per-frame imperative work: animations, material poking,
  dirty cascades. Collective (one mount), not per node.
- **`geometryKey?: (node) => string`** — cache key; skips rebuild when
  unchanged. Only for kinds whose geometry depends solely on their own
  fields. MUST NOT be set for neighbour-dependent geometry (wall/fence
  miters read via `ctx`).
- **`geometryChildTypes?: readonly string[]`** — child kinds whose live
  overrides affect this node's geometry.
- **`computeLevelData?: (siblings) => unknown`** — level-batch precompute,
  once per level per frame, lands in `ctx.levelData`. For O(N²) sibling work
  (wall miter graph). The `zone` TSL-uniform case shows the pattern.
- **`dirtyTracking?: boolean`** (default `true`) — set `false` only for
  structural kinds (site/building/level/zone/guide) with no dirty consumer;
  otherwise their marks accumulate and defeat per-frame early exits.

## Floorplan

- **`floorplan?: (node, ctx) => FloorplanGeometry | null`** — pure 2D builder
  mirroring `geometry`. Return `null` for 3D-only kinds.
- **`floorplanScope?: 'level' | 'building' | 'site'`** (default `'level'`) —
  which scope the plan layer walks. `'building'` for kinds parented to the
  building but shown per level (elevator); `'site'` for site children
  projected into plan coordinates.
- **`floorplanAffordances?: Record<string, FloorplanAffordance>`** — 2D drag
  sessions (`start`/`apply`/`commit`/`cancel`) driven through live
  override/transform stores.
- **`floorplanMoveTarget?`** — anchor-aware 2D move (doors/windows reparenting,
  `attachTo` surfaces). Simple XZ-translate kinds (shelf, fence) omit it and
  use the generic overlay.
- **`floorplanDependencies?`, `floorplanDependsOnSiblings?`,
  `floorplanAffectedIds?`, `floorplanSiblingOverrides?`** — cache-invalidation
  hooks for cross-node plan coupling (wall junctions, host opening cuts).
  Leave unset unless the kind reads other nodes during plan builds.

## Tools and Affordances

- **`tool?: LazyComponent`** — lazy 3D placement tool component.
- **`affordanceTools?: Record<string, LazyModule>`** — per-mode 3D drag
  components (e.g. `curvingFence → affordanceTools.curve`). Thin React
  wrappers around pure `DragAction` primitives in the kind's `actions/`
  folder — keep the action data unit-testable.
- **`affordances?: Affordance[]`** — declarative 3D handles (linear/arc
  resize, translate, rotate). See `shelfWidthHandle()` in
  `nodes/dist/shelf/definition.js` for the canonical handle shape.
- **`toolHints?: ToolHint[]`** — static shortcut hints rendered by
  `HelperManager`; keeps per-kind helper components unnecessary.
- **`quickActions?`** — extra floating-menu actions, mutations via `SceneApi`.
- **`drafting?: { surfaceQuery?, cancelOnHistoryJump? }`** — click-to-click
  construction behavior.
- **`snapProfile?: 'item' | 'structural'`** — free objects vs grid-locked
  structural runs.
- **`facingIndicator?: boolean | { reversed? }`** — floor direction triangle
  for kinds with a meaningful front.

## Capabilities and Relations

- **`capabilities`** — `movable`/`rotatable`/`scalable` configs,
  `hostable` (hosting on other nodes), `cuttable` (openings),
  `snappable`, `surfacePlacement: 'floor-only'`, plus select/duplicate/delete
  and `floorPlaced`/`paint` behaviors. Read the `Capabilities` type — do not
  guess keys.
- **`relations?`** — parent/child/hosting rules.
- **`parametrics?`** — parametric descriptor driving procedural UI.
- **`ports?: (node) => NodePort[]`** — typed connection points (duct/pipe
  runs, fittings, equipment plenums) for port-snapping; set
  `distributionRole: 'run' | 'fitting' | 'terminal' | 'equipment'` for
  distribution-system kinds, plus `portConnectivityFollow` for fittings.
- **`measurement?`** — stable semantic geometry for measurement anchors.
- **`tree?`** (`hidden`/`label`/`childIds`) — reshape sidebar-tree
  presentation without touching the tree component.
- **`selectionProxy?`** — grouped selection behavior with optional
  `bypassDirectPick`.

## Bake Policy (GLB Export)

- **`bake?: 'static' | 'strip' | 'replace'`** (default `'static'`).
  `'strip'` excludes from bake (heavy refs: scans, guides — viewer rebuilds
  live). `'replace'` bakes static geometry but the viewer hides it and
  re-renders live (dynamic content: shader wind, interactivity).
- **`bakeGeometry?` / `bakeGeometryAsync?`** — export-only builders against
  persisted data; must return a complete, detached, local-space snapshot
  with exporter-supported materials. Live objects are never passed.
- **`bakeReplaceRenderer?`** — collective renderer for `'replace'` kinds.
- **`exportAnimation?`** — kind-owned moving parts as engine-agnostic clips.

## Inspector Extensions

Declared on the **plugin**, not the kind:

```ts
{ id: 'vendor:pack:section', pluginId: 'vendor:pack', kinds: ['wall'],
  icon: IconRef, title: 'Engineering', component: lazy(() => import('./panel')) }
```

Selecting a matching kind swaps the inspector card body to this component
(receives `{ node }`), gated on the plugin being in `installedPlugins`.
Mobile appends instead of swapping.
