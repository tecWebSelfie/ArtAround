import { museumObjectId } from '@/lib/tour-navigation'
import { nestMarkersInLevel, type MapLike } from './museum-plugin/marker-hierarchy'
import { mapNodes } from './museum-plugin/markers-in-map'

/**
 * Which parts of a saved Pascal scene a curator may change.
 *
 * The museum map is one JSON document, but ownership inside it is split:
 * curators place, move and remove catalog objects (`museum-objects` items);
 * everything else — building structure, services (restaurants, toilets,
 * shops…), entrances/exits, other items — belongs to the director. The server
 * enforces this by diffing the stored scene against the incoming one
 * (`guardCuratorMapEdits` in `src/collections/Museums.ts`); the editor only
 * hides the director tools for convenience.
 */

/** Stable serialization so key order differences never count as edits. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

/**
 * Ids of nodes (and names of top-level scene keys) a curator changed but may
 * not touch. Adding or removing an
 * object also edits its parent's `children` list, so object ids are ignored
 * inside `children` when comparing the other nodes.
 */
export function curatorForbiddenChanges(storedMap: unknown, savedMap: unknown): string[] {
  // The editor nests legacy root markers under the ground level on load
  // (marker-hierarchy.ts): compare both maps in that shape, so saving such a
  // map (or one from an editor opened before the change) moves no marker.
  const nested = (map: unknown) => (mapNodes(map) ? nestMarkersInLevel(map as MapLike) : map)
  const previousMap = nested(storedMap)
  const nextMap = nested(savedMap)
  const previous = mapNodes(previousMap) ?? {}
  const next = mapNodes(nextMap) ?? {}
  // An id is a curator-owned object only when every side that has it holds a
  // `museum-objects` item: adding or removing an item is allowed, but an
  // existing id whose node changes kind (item -> wall/service/...) is a
  // structure edit and falls through to the regular diff below.
  const objectNodes = new Set(
    [...new Set([...Object.keys(previous), ...Object.keys(next)])].filter(
      (id) =>
        (!(id in previous) || museumObjectId(previous[id])) &&
        (!(id in next) || museumObjectId(next[id])),
    ),
  )
  const normalize = (node: unknown) => {
    if (!node || typeof node !== 'object') return stable(node)
    const { children, ...rest } = node as { children?: unknown }
    return stable(
      Array.isArray(children)
        ? { ...rest, children: children.filter((child) => !objectNodes.has(String(child))) }
        : rest,
    )
  }
  const forbidden: string[] = []
  for (const id of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    if (objectNodes.has(id)) continue
    if (normalize(previous[id]) !== normalize(next[id])) forbidden.push(id)
  }
  const roots = (map: unknown) =>
    stable((map as { rootNodeIds?: unknown } | null)?.rootNodeIds ?? [])
  if (roots(previousMap) !== roots(nextMap)) forbidden.push('rootNodeIds')
  // Every other top-level key (installedPlugins, materials, ...) is part of
  // the director's scene configuration: curators must leave it untouched.
  const topLevel = (map: unknown) =>
    map && typeof map === 'object' ? (map as Record<string, unknown>) : {}
  const [beforeTop, afterTop] = [topLevel(previousMap), topLevel(nextMap)]
  for (const key of new Set([...Object.keys(beforeTop), ...Object.keys(afterTop)])) {
    if (key === 'nodes' || key === 'rootNodeIds') continue
    if (stable(beforeTop[key]) !== stable(afterTop[key])) forbidden.push(key)
  }
  return forbidden
}
