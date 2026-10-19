/** Idempotent local fixture: no paid generation, no changes to existing museum records. */
import { config as loadEnv } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getPayload } from 'payload'
import { ItemNode, LevelNode, SlabNode } from '@pascal-app/core'
import { generateSoloNavMesh } from 'navcat/blocks'
import { getPositionsAndIndices } from 'navcat/three'
import { Mesh, PlaneGeometry } from 'three'
import { createMuseumMap } from '../src/mocks/museum.mock'
import { museumNavMeshOptions } from '../src/lib/pascal/navmesh-options'

loadEnv({ path: ['.env.local', '.env'] })
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
            pricing: { currency: 'eur' },
            objects: {},
            author: {},
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
  const existingTour = await payload.find({
    collection: 'tours',
    where: { title: { equals: label } },
    limit: 1,
    depth: 0,
  })
  const tour =
    existingTour.docs[0] ??
    (await payload.create({
      collection: 'tours',
      data: {
        title: label,
        contents: contents.slice(0, 2).map(({ id }) => id),
        pricing: { currency: 'eur' },
        museum: {},
        author: {},
      },
    }))
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
  const floor = new Mesh(new PlaneGeometry(12, 8).rotateX(-Math.PI / 2).translate(6, 0, 4))
  const [vertices, indices] = getPositionsAndIndices([floor])
  const { navMesh } = generateSoloNavMesh({ positions: vertices, indices }, museumNavMeshOptions)
  floor.geometry.dispose()
  museum = await payload.create({
    collection: 'museums',
    locale: 'en',
    data: {
      name: label,
      accessibility: { isAccessible: false },
      shortDescription: 'A local fixture for tour navigation testing.',
      ticketInfo: { label: 'Development fixture — free entry' },
      location: { address: 'Development fixture', city: 'Test', latlng: [9.19, 45.46] },
      objects: objects.map(({ id }) => id),
      tours: [tour.id],
      map,
      navMesh,
    },
  })
}
const tourId = typeof museum.tours?.[0] === 'string' ? museum.tours[0] : museum.tours?.[0]?.id
await mkdir('test-results', { recursive: true })
await writeFile(
  'test-results/tour-navigation-fixture.json',
  JSON.stringify(
    { museumId: museum.id, tourId, url: `http://localhost:3000/en/tour/${tourId}/navigation/0` },
    null,
    2,
  ),
)
console.info(`Tour fixture: http://localhost:3000/en/tour/${tourId}/navigation/0`)
await payload.destroy()
process.exit(0)
