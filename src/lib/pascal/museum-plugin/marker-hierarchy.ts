import { EXIT_ENTRANCE_NODE_TYPE } from './ExitEntranceNode'
import { SERVICE_NODE_TYPE } from './ServiceNode'

/**
 * Where museum markers (services, entrances, exits) belong in a Pascal scene:
 * children of a level, like Pascal's own `spawn` marker (its tool calls
 * `createNode(spawn, activeLevelId)`). Pascal's hierarchy is
 * site → building → level → floor content, and `setScene` keeps only the
 * site roots when there is one, dropping every other root as "unreachable".
 *
 * Maps saved before this rule kept markers as extra roots, so on load they
 * vanished: no service or exit to route to, no entrance to start from.
 * `nestMarkersInLevel` moves such roots under the ground level; the viewer and
 * the editor apply it to every map they load (`loadable-map.ts`), and the
 * curator permission diff applies it to both sides, so a legacy map saved
 * again is not counted as a structural edit. The stored map converges once a
 * director or curator saves it from the editor.
 */

export type MapLike = { nodes?: Record<string, unknown>; rootNodeIds?: string[] }
type SceneNode = { type?: unknown; parentId?: unknown; children?: unknown; level?: unknown }

const MARKER_TYPES = new Set<unknown>([SERVICE_NODE_TYPE, EXIT_ENTRANCE_NODE_TYPE])

/**
 * The ground level: `level` 0, else the one closest to it (a basement, -1,
 * never wins over a ground floor). Legacy markers were placed with world
 * coordinates at the scene root; museums so far have one floor, so all of
 * them go to the ground level with their x/z kept.
 */
export function groundLevelId(nodes: Record<string, unknown>): string | null {
  let ground: { id: string; rank: number } | null = null
  for (const [id, value] of Object.entries(nodes)) {
    const node = value as SceneNode | null
    if (node?.type !== 'level') continue
    const level = typeof node.level === 'number' ? node.level : 0
    // 0 first, then 1, -1, 2, -2…: upper floors before basements.
    const rank = Math.abs(level) * 2 - (level > 0 ? 1 : 0)
    if (!ground || rank < ground.rank) ground = { id, rank }
  }
  return ground?.id ?? null
}

/**
 * The map with every marker that has no existing parent nested under the
 * ground level; the same object when there is nothing to move (or no level
 * to move it to). Never mutates its input.
 */
export function nestMarkersInLevel<T extends MapLike>(map: T): T {
  const nodes = map.nodes
  if (!nodes) return map
  const loose = Object.entries(nodes)
    .filter(([, value]) => {
      const node = value as SceneNode | null
      if (!MARKER_TYPES.has(node?.type)) return false
      return typeof node?.parentId !== 'string' || !nodes[node.parentId]
    })
    .map(([id]) => id)
  const levelId = groundLevelId(nodes)
  if (!loose.length || !levelId) return map

  const level = nodes[levelId] as SceneNode
  const children = Array.isArray(level.children) ? (level.children as string[]) : []
  const nextNodes = {
    ...nodes,
    [levelId]: { ...level, children: [...new Set([...children, ...loose])] },
  }
  for (const id of loose) nextNodes[id] = { ...(nodes[id] as object), parentId: levelId }
  const nested = new Set(loose)
  return {
    ...map,
    nodes: nextNodes,
    rootNodeIds: map.rootNodeIds?.filter((id) => !nested.has(id)),
  }
}
