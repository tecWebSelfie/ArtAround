/**
 * Loads the Pascal plugins the museum map needs (the built-in node kinds, then
 * our service and exit markers) exactly once per page.
 *
 * Pascal's node registry is a module singleton and, outside its dev mode,
 * `loadPlugin` throws "duplicate node kind" for a plugin loaded twice. The
 * map viewer reloads its scene whenever it gets a new `map` object (every
 * server refresh of the navigation layout hands it one) and the map editor
 * shares the same registry, so each of them calling `loadPlugin` on its own
 * blanked the map in production builds after the first refresh. Every map
 * surface awaits this one promise instead.
 */
import { loadPlugin } from '@pascal-app/core'
import { builtinPlugin } from '@pascal-app/nodes'
import { museumPlugin } from './museum-plugin'

let loaded: Promise<void> | undefined

/** Resolves once both plugins are registered; later calls reuse the first load. */
export function loadMuseumPlugins(): Promise<void> {
  // Sequential: the museum plugin's kinds build on the built-in ones. A failed
  // load stays rejected (the registry may be half filled): the map surfaces
  // ask the visitor to reload the page.
  loaded ??= loadPlugin(builtinPlugin).then(() => loadPlugin(museumPlugin))
  return loaded
}
