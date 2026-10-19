# Plugin Authoring

## Plugin Shape

```ts
import type { Plugin } from '@pascal-app/core'

export const myPlugin: Plugin = {
  id: 'vendor:pack-name', // globally unique, e.g. 'artaround:museum-pack'
  apiVersion: 1, // only valid value today
  nodes: [couchDefinition, armchairDefinition], // AnyNodeDefinition[]
  inspectorExtensions: [engineeringSection], // optional, see node-definition.md
}
```

Verified in `node_modules/@pascal-app/core/dist/registry/types.d.ts:873`:
`Plugin = { id: string; apiVersion: 1; nodes?: AnyNodeDefinition[];
inspectorExtensions?: InspectorExtension[] }`.

## loadPlugin

Signature (`registry.d.ts:126`): `loadPlugin(plugin: Plugin): Promise<void>`.

1. Checks `plugin.apiVersion` against the host `HOST_API_VERSION` — mismatch
   throws, nothing registers.
2. Calls `registerNode()` for each entry in `nodes`.

Hard rules for v1:

- **Add-only.** No unload / hot-remove API. Load everything once at boot.
- **Duplicate `kind` throws in production, warns + replaces under HMR**
  (`registry.js` `_register`: dev mode logs `[registry] re-registering
  node kind "…" (HMR)` and overwrites; otherwise it throws `[registry]
  duplicate node kind`). Kind strings are global across all
  loaded plugins — prefix custom kinds (e.g. `ma-beacon`, not `beacon`) if a
  collision is plausible.
- **Registry freezes** after all plugins load; late `loadPlugin` calls are
  outside the supported path.
- Built-ins (`builtinPlugin` from `@pascal-app/nodes`) use the identical shape
  and call path — "the API is stress-tested by built-ins before any
  third-party plugin lands" (`nodes/dist/index.d.ts:1-18`). Copy them.

## Discovery

For the app to pick up external plugins without hardcoding imports:

```ts
import { setPluginDiscovery, discoverPlugins, loadPlugin } from '@pascal-app/core'

setPluginDiscovery(async () => [museumPlugin]) // must run before bootstrap
await loadPlugin(builtinPlugin)
for (const plugin of await discoverPlugins()) await loadPlugin(plugin)
// then mount <Viewer>
```

Default `discoverPlugins()` returns `[]`. Use `extendPluginDiscovery(fn)`
instead of `setPluginDiscovery(fn)` when you want to *add* a source without
clobbering a host-provided one (`setPluginDiscovery` replaces the chain —
core even `console.warn`s when it drops earlier registrations).

This repo's `MapViewer` currently
loads only `builtinPlugin` — wiring discovery (or a direct `loadPlugin` call)
is the code change that enables custom kinds in-app. See
[project-integration.md](project-integration.md).

## Install Gate

Scenes persist which plugins they were authored with:

```json
{ "nodes": { "...": "..." }, "rootNodeIds": ["..."], "installedPlugins": ["artaround:museum-pack"] }
```

`isNodeKindEnabled(kind, installedPlugins)` (`registry.js:178`):

- Built-in kinds (`BUILTIN_PLUGIN_ID`) are always enabled.
- Custom kinds render **only if** their plugin id is in the scene's
  `installedPlugins`. `undefined` (old maps) means "no gate".
- `validateBuildJson()` keeps and dedupes `installedPlugins`, warning (not
  failing) on a malformed value.

Consequences: **never rename a plugin id** after maps exist — every stored map
listing the old id stops rendering those kinds. Treat the id as a permanent
contract, like a Payload collection slug.

## Versioning

- `schemaVersion: number` lives per `NodeDefinition`. Bump it when the Zod
  schema shape changes; core ships `scene-migrations` (`@pascal-app/core/scene-migrations`)
  for upgrading persisted scenes.
- `apiVersion: 1` is the plugin-host contract, not your version — leave it.
