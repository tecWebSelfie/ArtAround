import { describe, expect, it } from 'vitest'
import { createRealisticMuseumMap } from '@/mocks/museum-map.mock'
import { curatorForbiddenChanges } from '@/lib/pascal/map-permissions'
import { groundLevelId, nestMarkersInLevel } from '@/lib/pascal/museum-plugin/marker-hierarchy'

// Pascal's setScene keeps only the site root, so markers must be level
// children (src/lib/pascal/museum-plugin/marker-hierarchy.ts).
const fixture = () => structuredClone(createRealisticMuseumMap('demo')) as unknown as Map
type Map = { nodes: Record<string, Record<string, unknown>>; rootNodeIds: string[] }

const markerIds = (map: Map) =>
  Object.keys(map.nodes).filter((id) => /^(service|exitEntrance)_/.test(id))

/** The same map as saved before the fix: every marker an extra root. */
function legacy(map: Map): Map {
  const level = Object.values(map.nodes).find((node) => node.type === 'level')!
  const ids = markerIds(map)
  level.children = (level.children as string[]).filter((id) => !ids.includes(id))
  for (const id of ids) map.nodes[id]!.parentId = null
  map.rootNodeIds = [...map.rootNodeIds, ...ids]
  return map
}

describe('museum markers in the scene hierarchy', () => {
  it('the fixture map already nests its markers under the level', () => {
    const map = fixture()
    expect(map.rootNodeIds).toHaveLength(1)
    expect(markerIds(map).length).toBeGreaterThan(0)
    expect(nestMarkersInLevel(map)).toBe(map)
  })

  it('nests legacy root markers under the ground level without touching the input', () => {
    const map = legacy(fixture())
    const before = structuredClone(map)
    const nested = nestMarkersInLevel(map)
    expect(map).toEqual(before)
    expect(nested.rootNodeIds).toEqual(fixture().rootNodeIds)
    const levelId = nested.nodes[markerIds(nested)[0]!]!.parentId as string
    expect(nested.nodes[levelId]!.type).toBe('level')
    expect(nested.nodes[levelId]!.children).toEqual(expect.arrayContaining(markerIds(nested)))
  })

  it('picks the ground floor over a basement', () => {
    const levels = {
      b: { type: 'level', level: -1 },
      g: { type: 'level', level: 0 },
      u: { type: 'level', level: 1 },
    }
    expect(groundLevelId(levels)).toBe('g')
    expect(groundLevelId({ b: levels.b, u: levels.u })).toBe('u')
  })

  it('a curator saving a legacy map once nested is not editing the markers', () => {
    const stored = legacy(fixture())
    expect(curatorForbiddenChanges(stored, nestMarkersInLevel(stored))).toEqual([])
    // An editor opened before the change still saves root markers.
    expect(curatorForbiddenChanges(stored, legacy(fixture()))).toEqual([])
    const moved = nestMarkersInLevel(stored)
    moved.nodes[markerIds(moved)[0]!]!.position = [1, 0, 1]
    expect(curatorForbiddenChanges(stored, moved)).toEqual([markerIds(moved)[0]])
  })
})

describe('asset URLs saved with the fallback origin', () => {
  it('are rebased on the site origin, other URLs untouched', async () => {
    const { rebaseAssetUrls } = await import('@/lib/pascal/object-assets')
    const map = {
      nodes: {
        standee: {
          asset: {
            src: 'http://localhost:3000/models/default-standee.glb',
            thumbnail: 'http://localhost:3000/models/default-standee.svg',
          },
        },
        mint: { asset: { src: 'https://cdn.example/model.glb', thumbnail: '' } },
        wall: { type: 'wall' },
      },
    }
    const rebased = rebaseAssetUrls(map, 'https://museo.example')
    expect(rebased.nodes.standee.asset).toEqual({
      src: 'https://museo.example/models/default-standee.glb',
      thumbnail: 'https://museo.example/models/default-standee.svg',
    })
    expect(rebased.nodes.mint).toBe(map.nodes.mint)
    expect(map.nodes.standee.asset.src).toContain('localhost')
    expect(rebaseAssetUrls(map, 'http://localhost:3000')).toBe(map)
  })
})
