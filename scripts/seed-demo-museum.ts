/**
 * Seeds the project's demo museum, the real Pinacoteca Nazionale di Bologna
 * the course specification asks for: the 11-room map from
 * `createRealisticMuseumMap` with 16 placed works, their contents (one paid,
 * some for children) written by the `autore1`/`autore2` accounts, four tours
 * with their logistic directions (three of at least ten works, one with a
 * quiz, and a family tour) and both navmeshes. Data lives in
 * `demo-museum-data.ts`; the required accounts in `src/seed-accounts.ts`.
 *
 *   pnpm seed:demo
 *
 * Idempotent: records are matched by name/title and updated in place, so IDs
 * (and URLs) survive re-runs; the map and navmeshes are rebuilt every time.
 * Unlike `seed-tour-navigation.ts` (the e2e fixture, kept minimal on
 * purpose), nothing tests depend on reads this museum.
 *
 * The navmeshes are built here from the map's own walls (split at every
 * doorway) and blocks over a flat floor, because Pascal's navigation geometry
 * needs a rendered scene. Saving the map in the editor replaces them with
 * Pascal's (`generateMuseumNavMeshesFromSceneRegistry`).
 */
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { config as loadEnv } from 'dotenv'
import { JSDOM } from 'jsdom'
import { mkdir, writeFile } from 'node:fs/promises'
import { createLocalReq, getPayload, type Payload } from 'payload'
import {
  BlockNode,
  DoorNode,
  ItemNode,
  LevelNode,
  WallNode,
  type ParsedBuildJson,
} from '@pascal-app/core'
import type { NavMesh, Vec3 } from 'navcat'
import { generateSoloNavMesh } from 'navcat/blocks'
import { getPositionsAndIndices } from 'navcat/three'
import { BoxGeometry, Mesh, PlaneGeometry, type BufferGeometry } from 'three'
import { createRealisticMuseumMap } from '../src/mocks/museum-map.mock'
import { museumNavMeshOptions, wheelchairNavMeshOptions } from '../src/lib/pascal/navmesh-options'
import { museumNavigationPath } from '../src/lib/pascal/navigation'
import { placeableObjectAsset } from '../src/lib/pascal/object-assets'
import { PROJECT_ACCOUNTS } from '../src/seed-accounts'
import { importWikidataSubjects } from '../src/tasks/importWikidataSubjects'
import { WIKIMEDIA_USER_AGENT } from '../src/lib/wikidata'
import { MUSEUM, OBJECTS, SUBJECT_CONTENTS, TOURS, type DemoAuthor } from './demo-museum-data'

loadEnv({ path: ['.env.local', '.env'] })

const MAP_KEY = 'demo_pinacoteca'
/** Main entrance marker of the realistic map, where every route starts. */
const ENTRANCE: Vec3 = [15, 0, 1]

/** Walkable floor plus obstacles, approximating what Pascal feeds navcat. */
function navigationMeshes(map: ParsedBuildJson): Mesh[] {
  const nodes = Object.values(map.nodes)
  const geometries: BufferGeometry[] = [
    // The building footprint (30 × 24 m), flat: room slabs are 5 cm finishes.
    new PlaneGeometry(30, 24).rotateX(-Math.PI / 2).translate(15, 0, 12),
  ]
  const doors = nodes.flatMap((node) => {
    const door = DoorNode.safeParse(node)
    return door.success ? [door.data] : []
  })
  for (const node of nodes) {
    const wall = WallNode.safeParse(node)
    if (!wall.success) continue
    const { start, end, height = 3.4, thickness = 0.2 } = wall.data
    const [dx, dz] = [end[0] - start[0], end[1] - start[1]]
    const length = Math.hypot(dx, dz)
    // Every doorway is walkable, closed doors included: visitors open them.
    const gaps = doors
      .filter((door) => door.wallId === wall.data.id)
      .map((door) => [door.position[0] - door.width / 2, door.position[0] + door.width / 2])
      .sort(([a], [b]) => a! - b!)
    let from = 0
    for (const [gapStart, gapEnd] of [...gaps, [length, length]]) {
      if (gapStart! - from > 0.01) {
        const middle = (from + gapStart!) / 2 / length
        geometries.push(
          new BoxGeometry(gapStart! - from, height, thickness)
            // Box length runs along x; turn it onto the wall's direction.
            .rotateY(Math.atan2(-dz, dx))
            .translate(start[0] + dx * middle, height / 2, start[1] + dz * middle),
        )
      }
      from = Math.max(from, gapEnd!)
    }
  }
  for (const node of nodes) {
    const block = BlockNode.safeParse(node)
    if (!block.success) continue
    // Box topologies are centred on x/z with their base at the node's y.
    const vertices = block.data.topology.vertices.map(({ position }) => position)
    const size = [0, 1, 2].map(
      (axis) =>
        Math.max(...vertices.map((v) => v[axis]!)) - Math.min(...vertices.map((v) => v[axis]!)),
    ) as [number, number, number]
    const [x, y, z] = block.data.position
    geometries.push(new BoxGeometry(...size).translate(x, y + size[1] / 2, z))
  }
  return geometries.map((geometry) => new Mesh(geometry))
}

/** Route length in metres from the entrance through every stop, or the leg that fails. */
function routeLength(mesh: NavMesh, stops: Vec3[]) {
  let total = 0
  const points = [ENTRANCE, ...stops]
  for (let index = 1; index < points.length; index++) {
    // Two items on the same work: the visitor doesn't move.
    if (points[index - 1]!.every((value, axis) => value === points[index]![axis])) continue
    const path = museumNavigationPath(mesh, points[index - 1]!, points[index]!)
    if (!path) return { failedLeg: index }
    for (let step = 1; step < path.length; step++) {
      const [a, b] = [path[step - 1]!, path[step]!]
      total += Math.hypot(b[0] - a[0], b[2] - a[2])
    }
  }
  return { metres: Math.round(total) }
}

/** Updates the first match or creates it, keeping IDs stable across runs. */
async function upsert<T extends { id: string | number }>(
  payload: Payload,
  collection: 'objects' | 'contents' | 'tours' | 'museums',
  field: string,
  value: string,
  data: Record<string, unknown>,
): Promise<T> {
  const found = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    locale: 'en',
    depth: 0,
    limit: 1,
  })
  // Demo objects have no 3D model: never queue Mint generation for them. The
  // Wikidata import runs below, right away, instead of as a queued job.
  const context = { skipMintModelGeneration: true, skipWikidataImport: true }
  const options = { collection, locale: 'en' as const, depth: 0, context, data: data as never }
  return (found.docs[0]
    ? await payload.update({ ...options, id: found.docs[0].id })
    : await payload.create(options)) as unknown as T
}

const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const editorConfig = await editorConfigFactory.default({ config: payload.config })

const categories = await payload.find({ collection: 'museumCategories', depth: 0, limit: 100 })
const categoryId = (slug: string) => categories.docs.find((doc) => doc.slug === slug)?.id
const categoryIds = (slugs: string[]) => slugs.flatMap((slug) => categoryId(slug) ?? [])

// The specification's accounts (created by the base seed too): the demo
// contents are theirs, so the examiners can log in as their authors.
const userIdByUsername = new Map<string, string>()
for (const account of PROJECT_ACCOUNTS) {
  const found = await payload.find({
    collection: 'users',
    where: { username: { equals: account.username } },
    depth: 0,
    limit: 1,
  })
  const user = found.docs[0] ?? (await payload.create({ collection: 'users', data: account }))
  userIdByUsername.set(account.username, String(user.id))
}
const authorId = (username: DemoAuthor) => userIdByUsername.get(username)!

/**
 * A 640 px photo of the work from Wikimedia Commons, uploaded once as the
 * object's thumbnail. Best effort: without network (or when Commons rate
 * limits us) the object simply keeps no thumbnail, as before.
 */
async function commonsThumbnail(object: (typeof OBJECTS)[number]) {
  const filename = `${object.key}.jpg`
  const existing = await payload.find({
    collection: 'objectsThumbnails',
    where: { filename: { equals: filename } },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) return existing.docs[0].id
  try {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(object.image)}?width=640`
    const response = await fetch(url, {
      headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = Buffer.from(await response.arrayBuffer())
    const doc = await payload.create({
      collection: 'objectsThumbnails',
      locale: 'en',
      depth: 0,
      data: { alt: object.name },
      file: { data, mimetype: 'image/jpeg', name: filename, size: data.length },
    })
    return doc.id
  } catch (error) {
    console.warn(`No Commons photo for "${object.name}": ${String(error)}`)
    return undefined
  }
}

// Contents first: an object needs at least one, and owns its contents.
const contentIdByTitle = new Map<string, string>()
const objectIdByKey = new Map<string, string>()
const objectByContentTitle = new Map<string, (typeof OBJECTS)[number]>()
for (const object of OBJECTS) {
  const contentIds: string[] = []
  for (const content of object.contents) {
    const doc = await upsert<{ id: string }>(payload, 'contents', 'title', content.title, {
      title: content.title,
      bodyHTML: content.bodyHTML,
      difficulty: content.difficulty,
      audience: content.audience ?? 'everyone',
      price: content.price ?? null,
      sources: content.sources ?? [],
      categories: categoryIds(object.categories),
      author: authorId(content.author),
      objects: {},
    })
    contentIds.push(String(doc.id))
    contentIdByTitle.set(content.title, String(doc.id))
    objectByContentTitle.set(content.title, object)
  }
  const doc = await upsert<{ id: string }>(payload, 'objects', 'name', object.name, {
    name: object.name,
    wikidataId: object.wikidataId,
    inventoryNumber: object.inventoryNumber ?? null,
    artist: object.artist,
    dating: object.dating,
    description: object.description,
    provenance: object.provenance,
    condition: object.condition,
    creditLine: object.creditLine,
    rights: object.rights,
    categories: categoryIds(object.categories),
    contents: contentIds,
    thumbnail: await commonsThumbnail(object),
  })
  objectIdByKey.set(object.key, String(doc.id))
}
console.info(`${OBJECTS.length} objects and ${contentIdByTitle.size} contents ready.`)

// Authors, movements and events from each work's Wikidata item (best effort:
// without network the works keep only their own data).
const localReq = await createLocalReq({}, payload)
let linkedSubjects = 0
for (const [key, id] of objectIdByKey) {
  try {
    linkedSubjects += (await importWikidataSubjects(localReq, id)).subjects
  } catch (error) {
    console.warn(`No Wikidata subjects for "${key}": ${String(error)}`)
  }
}
console.info(`${linkedSubjects} subject links from Wikidata.`)

// Contents about a subject rather than a work (an item about an artist).
for (const subjectContent of SUBJECT_CONTENTS) {
  const subject = (
    await payload.find({
      collection: 'subjects',
      where: { wikidataId: { equals: subjectContent.wikidataId } },
      depth: 0,
      limit: 1,
    })
  ).docs[0]
  if (!subject) continue
  const doc = await upsert<{ id: string }>(payload, 'contents', 'title', subjectContent.title, {
    title: subjectContent.title,
    bodyHTML: subjectContent.bodyHTML,
    difficulty: subjectContent.difficulty,
    audience: 'everyone',
    sources: subjectContent.sources ?? [],
    author: authorId(subjectContent.author),
    objects: {},
  })
  const contents = new Set([...(subject.contents ?? []).map(String), String(doc.id)])
  await payload.update({
    collection: 'subjects',
    id: subject.id,
    depth: 0,
    data: { contents: [...contents] },
  })
}

// Place every object; `museums.objects` is derived from these items on save.
const map = createRealisticMuseumMap(MAP_KEY)
const level = LevelNode.parse(Object.values(map.nodes).find((n) => LevelNode.safeParse(n).success))
for (const object of OBJECTS) {
  const id = objectIdByKey.get(object.key)!
  // Demo objects have no Mint model: the default info standee stands in.
  const asset = placeableObjectAsset({ id, name: object.name, model: null, thumbnail: null })
  // Pascal's schema accepts plain http only on localhost, and
  // NEXT_PUBLIC_PAYLOAD_URL may be a LAN address (phone testing).
  for (const field of ['src', 'thumbnail'] as const) {
    const url = new URL(asset[field] as string)
    asset[field] = `http://localhost:3000${url.pathname}`
  }
  const item = ItemNode.parse({
    id: `item_${MAP_KEY}_${object.key.replace(/-/g, '_')}`,
    parentId: level.id,
    position: [object.position[0], 0, object.position[1]],
    asset,
  })
  ;(map.nodes as Record<string, unknown>)[item.id] = item
  level.children = [...level.children, item.id]
}
;(map.nodes as Record<string, unknown>)[level.id] = level

const meshes = navigationMeshes(map)
const [positions, indices] = getPositionsAndIndices(meshes)
for (const mesh of meshes) mesh.geometry.dispose()
console.info('Generating the walking and wheelchair navmeshes…')
const navMesh = generateSoloNavMesh({ positions, indices }, museumNavMeshOptions).navMesh
const navMeshWheelchair = generateSoloNavMesh(
  { positions, indices },
  wheelchairNavMeshOptions,
).navMesh

const museum = await upsert<{ id: string }>(payload, 'museums', 'name', MUSEUM.name, {
  name: MUSEUM.name,
  shortDescription: MUSEUM.shortDescription,
  descriptionHTML: MUSEUM.descriptionHTML,
  categories: categoryIds(MUSEUM.categories),
  email: MUSEUM.email,
  accessibility: {
    isAccessible: true,
    stepFreeEntrance: true,
    elevator: false,
    accessibleBathrooms: true,
    tactilePaths: false,
    audioGuides: true,
    signLanguage: false,
    serviceAnimals: true,
    notes: 'The ground floor is step-free; wheelchairs are available at the ticket office.',
  },
  location: {
    address: MUSEUM.address,
    city: MUSEUM.city,
    region: MUSEUM.region,
    postalCode: MUSEUM.postalCode,
    country: 'IT',
    latlng: MUSEUM.latlng,
  },
  ticketInfo: { label: MUSEUM.ticketLabel, url: MUSEUM.ticketUrl },
  news: MUSEUM.news,
  map,
  navMesh,
  navMeshWheelchair,
})
console.info(`Museum ready: ${museum.id}`)

const tours: { id: string; title: string; url: string; metres?: number }[] = []
for (const tour of TOURS) {
  const stops = tour.stops.map((title) => {
    const object = objectByContentTitle.get(title)
    if (!object) throw new Error(`Tour "${tour.title}": no content titled "${title}"`)
    return [object.position[0], 0, object.position[1]] as Vec3
  })
  const walking = routeLength(navMesh, stops)
  const wheelchair = routeLength(navMeshWheelchair, stops)
  if (walking.failedLeg)
    throw new Error(`"${tour.title}": no walking route to stop ${walking.failedLeg}`)
  if (tour.wheelchairAccessible && wheelchair.failedLeg) {
    throw new Error(`"${tour.title}": no wheelchair route to stop ${wheelchair.failedLeg}`)
  }
  const doc = await upsert<{ id: string; quiz?: { questions?: unknown[] | null } }>(
    payload,
    'tours',
    'title',
    tour.title,
    {
      title: tour.title,
      description: tour.description,
      // Tours have no `bodyHTML` input (contents and museums do).
      body: convertHTMLToLexical({ editorConfig, JSDOM, html: tour.bodyHTML }),
      contents: tour.stops.map((title) => contentIdByTitle.get(title)!),
      // Logistic directions: the visit's practical information, and how to
      // reach each stop (`src/lib/tour-logistics.ts`).
      logistics: tour.logistics,
      directions: Object.entries(tour.directions).map(([title, text]) => ({
        content: contentIdByTitle.get(title)!,
        text,
      })),
      museum: museum.id,
      // Tours are curated by the first author account.
      author: authorId('autore1'),
      durationMinutes: tour.durationMinutes,
      distanceMeters: walking.metres,
      wheelchairAccessible: tour.wheelchairAccessible,
      categories: categoryIds(tour.categories),
    },
  )
  // Tour-owned questions (no `relatedTo`), added once: they live and die with the tour.
  if (tour.quiz.length && !doc.quiz?.questions?.length) {
    const questions = []
    for (const { prompt, correctAnswer, wrong } of tour.quiz) {
      questions.push(
        await payload.create({
          collection: 'quizQuestions',
          locale: 'en',
          depth: 0,
          data: {
            prompt,
            correctAnswer,
            wrongAnswers: wrong.map((text) => ({ text })),
            difficulty: 'medium',
          },
        }),
      )
    }
    await payload.update({
      collection: 'tours',
      id: doc.id,
      depth: 0,
      data: { quiz: { questions: questions.map(({ id }) => id) } },
    })
  }
  // Tours open inside their museum's navigation (tourNavigationPath).
  const url = `http://localhost:3000/en/museum/${museum.id}/navigation/tour/${doc.id}/0`
  tours.push({ id: String(doc.id), title: tour.title, url, metres: walking.metres })
  console.info(`${tour.title}: ${tour.stops.length} stops, ${walking.metres} m → ${url}`)
}

await mkdir('.e2e-fixtures', { recursive: true })
await writeFile(
  '.e2e-fixtures/demo-museum.json',
  JSON.stringify(
    {
      museumId: museum.id,
      museumUrl: `http://localhost:3000/en/museum/${museum.id}`,
      tours,
      objects: Object.fromEntries(objectIdByKey),
    },
    null,
    2,
  ),
)
await payload.destroy()
process.exit(0)
