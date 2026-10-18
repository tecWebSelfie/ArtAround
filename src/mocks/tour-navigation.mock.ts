import { ItemNode, LevelNode, SlabNode } from '@pascal-app/core'
import { generateSoloNavMesh } from 'navcat/blocks'
import { getPositionsAndIndices } from 'navcat/three'
import { BoxGeometry, Mesh, PlaneGeometry } from 'three'
import { museumNavMeshOptions } from '@/lib/pascal/navmesh-options'
import type { NavigationCatalogObject } from '@/lib/tour-navigation'
import { createMuseumMap, mockMuseumFull } from './museum.mock'

export const routeCatalog: NavigationCatalogObject[] = [
  { id: 'route-start', name: 'Entrance exhibit', contents: [] },
  { id: 'route-end', name: 'Gallery exhibit', contents: [] },
]

/** A real Navcat route must bend around the divider, rather than join two points directly. */
export function createRouteMuseum(modelURL: string) {
  const map = createMuseumMap('route-story', {
    width: 12,
    depth: 8,
    partitions: [{ start: [6, 0], end: [6, 5] }],
  })
  const level = LevelNode.parse(
    Object.values(map.nodes).find((node) => (node as { type?: string }).type === 'level'),
  )
  const slab = SlabNode.parse({
    parentId: level.id,
    polygon: [
      [0, 0],
      [12, 0],
      [12, 8],
      [0, 8],
    ],
    thickness: 0.2,
  })
  const items = routeCatalog.map((object, index) =>
    ItemNode.parse({
      parentId: level.id,
      position: [index === 0 ? 2 : 10, 0, 2],
      asset: {
        id: object.id,
        name: object.name,
        category: 'museum-objects',
        src: modelURL,
        thumbnail: '',
      },
    }),
  )
  for (const node of [slab, ...items]) map.nodes[node.id] = node
  level.children = [...(level.children ?? []), slab.id, ...items.map(({ id }) => id)]
  map.nodes[level.id] = level

  const floor = new Mesh(new PlaneGeometry(12, 8).rotateX(-Math.PI / 2).translate(6, 0, 4))
  const divider = new Mesh(new BoxGeometry(0.2, 3, 5).translate(6, 1.5, 2.5))
  const [positions, indices] = getPositionsAndIndices([floor, divider])
  // Storybook only needs the detour geometry; use coarser voxels to keep previews fast.
  const options = {
    ...museumNavMeshOptions,
    cellSize: 0.15,
    cellHeight: 0.25,
    walkableRadiusVoxels: 2,
    walkableClimbVoxels: 1,
    walkableHeightVoxels: 8,
    detailSampleDistance: 0.9,
    detailSampleMaxError: 0.25,
  }
  const { navMesh } = generateSoloNavMesh({ positions, indices }, options)
  floor.geometry.dispose()
  divider.geometry.dispose()
  return { ...mockMuseumFull, map, navMesh, navMeshWheelchair: navMesh }
}
