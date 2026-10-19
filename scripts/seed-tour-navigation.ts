/** Idempotent local fixture: no paid generation, no changes to existing museum records. */
import { config as loadEnv } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getPayload } from 'payload'
import { ItemNode, LevelNode, SlabNode, ZoneNode } from '@pascal-app/core'
import { generateSoloNavMesh } from 'navcat/blocks'
import { getPositionsAndIndices } from 'navcat/three'
import { Mesh, PlaneGeometry } from 'three'
import { createMuseumMap } from '../src/mocks/museum.mock'
import { museumNavMeshOptions } from '../src/lib/pascal/navmesh-options'

loadEnv({ path: ['.env.local', '.env'] })

const WEST_HALL_ID = 'zone_navigation_fixture_west'

/**
 * Two named rooms either side of x = 6, so route directions have rooms to
 * name and nearby suggestions have rooms to enter: Object 1 stands in the
 * West hall, Objects 2 and 3 in the East hall.
 */
function addFixtureRooms(nodes: Record<string, unknown>) {
  const level = Object.values(nodes).find((node) => LevelNode.safeParse(node).success) as
    | { id: string; children?: string[] }
    | undefined
  if (!level) return
  const rooms = [
    { id: WEST_HALL_ID, name: 'West hall', x: 0 },
    { id: 'zone_navigation_fixture_east', name: 'East hall', x: 6 },
  ].map(({ id, name, x }) =>
    ZoneNode.parse({
      id,
      name,
      parentId: level.id,
      polygon: [
        [x, 0],
        [x + 6, 0],
        [x + 6, 8],
        [x, 8],
      ],
    }),
  )
  for (const room of rooms) nodes[room.id] = room
  level.children = [...(level.children ?? []), ...rooms.map(({ id }) => id)]
}
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
console.info('Payload ready; creating or reusing the navigation fixture.')
const label = '[DEV] Tour navigation'
const existing = await payload.find({
  collection: 'museums',
  where: { name: { equals: label } },
  depth: 0,
  limit: 1,
})
let museum = existing.docs[0]

if (!museum) {
  const contents = await Promise.all(
    ['First stop', 'Second stop', 'Side discovery'].map(async (title) => {
      const found = await payload.find({
        collection: 'contents',
        where: { title: { equals: `${label}: ${title}` } },
        locale: 'en',
        limit: 1,
        depth: 0,
      })
      return (
        found.docs[0] ??
        payload.create({
          collection: 'contents',
          locale: 'en',
          data: {
            title: `${label}: ${title}`,
            difficulty: 'easy',
            copyright: 'Development fixture',
            objects: {},
            body: {
              root: {
                type: 'root',
                version: 1,
                direction: 'ltr',
                format: '',
                indent: 0,
                children: [
                  {
                    type: 'paragraph',
                    version: 1,
                    children: [
                      { type: 'text', version: 1, text: `Development fixture — ${title}.` },
                    ],
                  },
                ],
              },
            },
          },
        })
      )
    }),
  )
  const existingObject = await payload.find({
    collection: 'objects',
    where: { name: { equals: `${label}: Object 1` } },
    locale: 'en',
    depth: 0,
    limit: 1,
  })
  const existingModel = existingObject.docs[0]?.model
  const modelId = existingModel
    ? typeof existingModel === 'string'
      ? existingModel
      : existingModel.id
    : (
        await payload.create({
          collection: 'objectsModels',
          filePath: resolve('public/models/Avatar.glb'),
          data: { userGenerated: true },
        })
      ).id
  const objects = await Promise.all(
    contents.map(async (content, index) => {
      const found = await payload.find({
        collection: 'objects',
        where: { name: { equals: `${label}: Object ${index + 1}` } },
        locale: 'en',
        limit: 1,
        depth: 0,
      })
      return (
        found.docs[0] ??
        payload.create({
          collection: 'objects',
          context: { skipMintModelGeneration: true },
          locale: 'en',
          data: { name: `${label}: Object ${index + 1}`, contents: [content.id], model: modelId },
        })
      )
    }),
  )
  const map = createMuseumMap('navigation_fixture', { width: 12, depth: 8, partitions: [] })
  const level = LevelNode.parse(
    Object.values(map.nodes).find((node) => LevelNode.safeParse(node).success),
  )
  map.nodes[level.id] = level
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
  map.nodes[slab.id] = slab
  const positions: [number, number, number][] = [
    [2, 0, 2],
    [8, 0, 2],
    [8, 0, 6],
  ]
  const items = objects.map((object, index) =>
    ItemNode.parse({
      parentId: level.id,
      position: positions[index],
      asset: {
        id: object.id,
        name: object.name,
        category: 'museum-objects',
        src: 'http://localhost:3000/models/Avatar.glb',
        thumbnail: '',
      },
    }),
  )
  for (const item of items) map.nodes[item.id] = item
  level.children = [...(level.children ?? []), slab.id, ...items.map(({ id }) => id)]
  addFixtureRooms(map.nodes)
  const floor = new Mesh(new PlaneGeometry(12, 8).rotateX(-Math.PI / 2).translate(6, 0, 4))
  const [vertices, indices] = getPositionsAndIndices([floor])
  const { navMesh } = generateSoloNavMesh({ positions: vertices, indices }, museumNavMeshOptions)
  floor.geometry.dispose()
  museum = await payload.create({
    collection: 'museums',
    locale: 'en',
    data: {
      name: label,
      accessibility: false,
      shortDescription: 'A local fixture for tour navigation testing.',
      ticketInfo: { label: 'Development fixture — free entry' },
      location: { address: 'Development fixture', city: 'Test', latlng: [9.19, 45.46] },
      // Placing the objects on the map is what makes the museum exhibit them
      // (`museums.objects` is derived on save).
      map,
      navMesh,
    },
  })
  // Tours own their museum link (`tours.museum`), so they come after it.
  const existingTour = await payload.find({
    collection: 'tours',
    where: { title: { equals: label } },
    limit: 1,
    depth: 0,
  })
  if (!existingTour.docs[0]) {
    await payload.create({
      collection: 'tours',
      data: { title: label, contents: contents.slice(0, 2).map(({ id }) => id), museum: museum.id },
    })
  }
}
// Fixtures seeded before route directions existed get their rooms added once.
const savedMap = museum.map as { nodes?: Record<string, unknown> } | null | undefined
if (savedMap?.nodes && !(WEST_HALL_ID in savedMap.nodes)) {
  addFixtureRooms(savedMap.nodes)
  museum = await payload.update({
    collection: 'museums',
    id: museum.id,
    locale: 'en',
    data: { map: savedMap },
  })
  console.info('Added West/East hall rooms to the existing fixture map.')
}
const fixtureObjects = await payload.find({
  collection: 'objects',
  where: { name: { like: `${label}: Object` } },
  locale: 'en',
  depth: 0,
  sort: 'name',
  limit: 3,
})
// Found by title: tours seeded before `tours.museum` existed have no museum
// link, so they are linked here (the navigation route needs it).
const fixtureTour = await payload.find({
  collection: 'tours',
  where: { title: { equals: label } },
  limit: 1,
  depth: 0,
})
const tourId = fixtureTour.docs[0]?.id
if (tourId && !fixtureTour.docs[0].museum) {
  await payload.update({ collection: 'tours', id: tourId, data: { museum: museum.id }, depth: 0 })
  console.info('Linked the fixture tour to its museum.')
}
// Not under test-results/: Playwright empties that folder when a run starts.
await mkdir('.e2e-fixtures', { recursive: true })
await writeFile(
  '.e2e-fixtures/tour-navigation-fixture.json',
  JSON.stringify(
    {
      museumId: museum.id,
      tourId,
      // Object 1 is in the West hall; Objects 2 and 3 are in the East hall.
      objectIds: fixtureObjects.docs.map(({ id }) => id),
      url: `http://localhost:3000/en/tour/${tourId}/navigation/0`,
    },
    null,
    2,
  ),
)
console.info(`Tour fixture: http://localhost:3000/en/tour/${tourId}/navigation/0`)
await payload.destroy()
process.exit(0)
