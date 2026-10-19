import { ItemNode, LevelNode, SlabNode, ZoneNode } from '@pascal-app/core'
import { ExitEntranceNode } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import { ServiceNode } from '@/lib/pascal/museum-plugin/ServiceNode'
import { generateSoloNavMesh } from 'navcat/blocks'
import { getPositionsAndIndices } from 'navcat/three'
import { BoxGeometry, Mesh, PlaneGeometry } from 'three'
import { museumNavMeshOptions } from '@/lib/pascal/navmesh-options'
import type { NavigationCatalogObject } from '@/lib/tour-navigation'
import { createMuseumMap, mockMuseumFull } from './museum.mock'

// Off-tour contents (one free, one paid and locked) so nearby suggestions and
// the locked price badge have something to show in the route stories.
export const routeCatalog: NavigationCatalogObject[] = [
  {
    id: 'route-start',
    name: 'Entrance exhibit',
    contents: [{ id: 'route-start-story', title: 'How the hall was built' }],
  },
  {
    id: 'route-end',
    name: 'Gallery exhibit',
    contents: [{ id: 'route-end-paid', title: 'Workshop secrets', price: 450, locked: true }],
  },
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
  // Keep the route story useful for every navigation control: service search,
  // nearest-service routing, and entrance/exit destinations share this mesh.
  const markers = [
    ServiceNode.parse({
      id: 'service_route_toilets',
      name: 'Toilets',
      service: 'bathrooms',
      position: [2, 0, 6],
      placed: true,
    }),
    ServiceNode.parse({
      id: 'service_route_cafe',
      name: 'Cafe',
      service: 'food',
      position: [10, 0, 2],
      placed: true,
    }),
    ServiceNode.parse({
      id: 'service_route_shop',
      name: 'Shop',
      service: 'shop',
      position: [10, 0, 6],
      placed: true,
    }),
    ServiceNode.parse({
      id: 'service_route_info',
      name: 'Information desk',
      service: 'infoPoint',
      position: [2, 0, 4],
      placed: true,
    }),
    ExitEntranceNode.parse({
      id: 'exitEntrance_route_entrance',
      name: 'Entrance',
      direction: 'entrance',
      position: [2, 0, 1],
      placed: true,
    }),
    ExitEntranceNode.parse({
      id: 'exitEntrance_route_exit',
      name: 'Exit',
      direction: 'exit',
      position: [10, 0, 7],
      placed: true,
    }),
  ]
  // Two named rooms either side of the divider, so route directions have
  // rooms to name ("Start in West hall", "… into East hall").
  const rooms = [
    ZoneNode.parse({
      id: 'zone_route_west',
      name: 'West hall',
      parentId: level.id,
      polygon: [
        [0, 0],
        [6, 0],
        [6, 8],
        [0, 8],
      ],
    }),
    ZoneNode.parse({
      id: 'zone_route_east',
      name: 'East hall',
      parentId: level.id,
      polygon: [
        [6, 0],
        [12, 0],
        [12, 8],
        [6, 8],
      ],
    }),
  ]
  for (const node of [slab, ...items, ...rooms]) map.nodes[node.id] = node
  for (const marker of markers) map.nodes[marker.id] = marker
  level.children = [
    ...(level.children ?? []),
    slab.id,
    ...items.map(({ id }) => id),
    ...rooms.map(({ id }) => id),
  ]
  map.nodes[level.id] = level
  map.rootNodeIds = [...map.rootNodeIds, ...markers.map(({ id }) => id)]
  map.installedPlugins = ['artaround:museum-plugin']

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
