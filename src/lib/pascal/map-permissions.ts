import { museumObjectId } from '@/lib/tour-navigation'
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
 * Ids of nodes a curator changed but may not touch. Adding or removing an
 * object also edits its parent's `children` list, so object ids are ignored
 * inside `children` when comparing the other nodes.
 */
export function curatorForbiddenChanges(previousMap: unknown, nextMap: unknown): string[] {
  const previous = mapNodes(previousMap) ?? {}
  const next = mapNodes(nextMap) ?? {}
  const objectNodes = new Set(
    [...Object.entries(previous), ...Object.entries(next)]
      .filter(([, node]) => museumObjectId(node))
      .map(([id]) => id),
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
  return forbidden
}
