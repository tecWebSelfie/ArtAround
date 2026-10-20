import { mockObjectsList } from '@/mocks/object.mock'
import type { Museum, MuseumThumbnail } from '@/payload-types'
import { BuildingNode, LevelNode, SiteNode, WallNode, type ParsedBuildJson } from '@pascal-app/core'
import { createRealisticMuseumMap } from './museum-map.mock'
import { mockToursList } from './tour.mock'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

type MuseumMapOptions = {
  width: number
  depth: number
  partitions?: { start: [number, number]; end: [number, number] }[]
}

export function createMuseumMap(museumId: string, options: MuseumMapOptions): ParsedBuildJson {
  const mapKey = museumId.replace(/[^a-zA-Z0-9_]/g, '_')
  const siteId = `site_${mapKey}`
  const buildingId = `building_${mapKey}`
  const levelId = `level_${mapKey}`
  const wallSegments: MuseumMapOptions['partitions'] = [
    { start: [0, 0], end: [options.width, 0] },
    { start: [options.width, 0], end: [options.width, options.depth] },
    { start: [options.width, options.depth], end: [0, options.depth] },
    { start: [0, options.depth], end: [0, 0] },
    ...(options.partitions ?? []),
  ]
  const walls = wallSegments.map((segment, index) =>
    WallNode.parse({
      id: `wall_${mapKey}_${index + 1}`,
      parentId: levelId,
      start: segment.start,
      end: segment.end,
    }),
  )
  const wallIds = walls.map((wall) => wall.id)
  const level = LevelNode.parse({
    id: levelId,
    parentId: buildingId,
    children: wallIds,
  })
  const building = BuildingNode.parse({
    id: buildingId,
    parentId: siteId,
    children: [level.id],
  })
  const site = SiteNode.parse({
    id: siteId,
    children: [building.id],
    polygon: {
      type: 'polygon',
      points: [
        [0, 0],
        [options.width, 0],
        [options.width, options.depth],
        [0, options.depth],
      ],
    },
  })

  return {
    nodes: Object.fromEntries([site, building, level, ...walls].map((node) => [node.id, node])),
    rootNodeIds: [site.id],
  } satisfies ParsedBuildJson
}

function baseMuseum(): Museum {
  return {
    id: 'museum-001',
    name: 'Museo Civico di Esempio',
    shortDescription: 'Breve descrizione del museo in meno di cento caratteri.',
    accessibility: { isAccessible: true },
    ticketInfo: {
      label: 'Biglietti',
      url: 'https://example.com/biglietti',
    },
    location: {
      address: 'Via dei Musei 1',
      city: 'Milano',
      latlng: [45.4642, 9.19],
    },
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    // `tours` is the join over `tours.museum`.
    tours: { docs: mockToursList, totalDocs: mockToursList.length, hasNextPage: false },
    thumbnails: [
      {
        alt: 'Facciata del museo',
        id: 'thumb-1',
        updatedAt: TIMESTAMP,
        createdAt: TIMESTAMP,
        // Seeded like tour.mock.ts: a bare picsum URL is a random photo per request,
        // which breaks the visual-regression baselines.
        url: 'https://picsum.photos/seed/thumb-1/200/300',
      },
    ] satisfies MuseumThumbnail[],
    // Map-derived index of exhibited objects (see `syncMuseumObjects`).
    objects: mockObjectsList,
  }
}

export function createMuseum(overrides?: Partial<Museum>): Museum {
  const museum = { ...baseMuseum(), ...overrides }
  // Most fixtures exercise map-aware UI, so start from a complete scene; tests
  // for the missing-map state pass `map: null` explicitly.
  if (overrides?.map === undefined) {
    museum.map = createRealisticMuseumMap(museum.id)
  }
  return museum
}

export const mockMuseumMinimal: Museum = createMuseum()

export const mockMuseumFull: Museum = createMuseum({
  id: 'museum-full-001',
  description: {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [
            {
              type: 'text',
              version: 1,
              text: 'Descrizione estesa del museo con la storia delle collezioni, le sale espositive e le attivita didattiche.',
            },
          ],
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  },
  accessibility: { isAccessible: true },
  map: createRealisticMuseumMap('museum-full-001'),
  phone: {
    e164: '+390200000000',
    regionCode: 'IT',
    callingCode: '+39',
    national: '02 00000000',
    international: '+39 02 00000000',
  },
  email: 'info@museo-esempio.it',
  socials: [
    { platform: 'instagram', url: 'https://instagram.com/museo-esempio', id: 'social-1' },
    { platform: 'facebook', url: 'https://facebook.com/museo-esempio', id: 'social-2' },
  ],
  news: [
    {
      title: 'Nuova ala espositiva',
      content: 'Inaugurazione della nuova ala dedicata all’arte contemporanea.',
      date: '2026-03-01T09:00:00.000Z',
      id: 'news-1',
    },
    {
      title: 'Visite guidate gratuite',
      content: 'Ogni prima domenica del mese le visite guidate sono gratuite.',
      date: '2026-02-01T09:00:00.000Z',
      id: 'news-2',
    },
  ],
  thumbnails: [
    {
      id: 'thumb-1',
      alt: 'Facciata del museo',
      updatedAt: TIMESTAMP,
      createdAt: TIMESTAMP,
      url: 'https://picsum.photos/seed/thumb-1/200/300',
      filename: 'museum-facade.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
    },
    {
      id: 'thumb-2',
      alt: 'Sala espositiva principale',
      updatedAt: TIMESTAMP,
      createdAt: TIMESTAMP,
      url: 'https://picsum.photos/seed/thumb-2/200/300',
      filename: 'museum-hall.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
    },
  ],
  objects: mockObjectsList,
  // Payload stores museum opening times in date fields; use ISO timestamps so
  // these reusable fixtures pass the same validation as seeded documents.
  openingHours: {
    monday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-mon-1' },
    ],
    tuesday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-tue-1' },
    ],
    wednesday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-wed-1' },
    ],
    thursday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T20:00:00.000Z', id: 'oh-thu-1' },
    ],
    friday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-fri-1' },
    ],
    saturday: [
      { opening: '2026-01-15T10:00:00.000Z', closing: '2026-01-15T19:00:00.000Z', id: 'oh-sat-1' },
    ],
    sunday: [
      { opening: '2026-01-15T10:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-sun-1' },
    ],
    notes: null,
  },
  lfrs: {
    favouritesCount: 128,
    sharesCount: 42,
  },
})

export const mockMuseumNoMedia: Museum = createMuseum({
  id: 'museum-nomedia-001',
  thumbnails: null,
  map: null,
})

export const mockMuseumUffizi: Museum = createMuseum({
  id: 'museum-uffizi-001',
  name: 'Galleria degli Uffizi',
  shortDescription: 'Le collezioni rinascimentali più celebri al mondo.',
  map: createRealisticMuseumMap('museum-uffizi-001'),
})

export const mockMuseumBrera: Museum = createMuseum({
  id: 'museum-brera-001',
  name: 'Pinacoteca di Brera',
  shortDescription: 'Capolavori della pittura italiana dal Trecento al Novecento.',
  map: createRealisticMuseumMap('museum-brera-001'),
})

export const mockMuseumClosed: Museum = createMuseum({
  id: 'museum-closed-001',
  openingHours: {
    monday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-mon-1' },
    ],
    tuesday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-tue-1' },
    ],
    wednesday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-wed-1' },
    ],
    thursday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-thu-1' },
    ],
    friday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-fri-1' },
    ],
    saturday: [
      { opening: '2026-01-15T10:00:00.000Z', closing: '2026-01-15T13:00:00.000Z', id: 'oh-sat-1' },
    ],
    sunday: null,
    notes: 'Chiuso la domenica e nei giorni festivi.',
  },
})

export const mockMuseumWithServices: Museum = createMuseum({
  id: 'museum-services-001',
  accessibility: { isAccessible: true },
  openingHours: {
    monday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-mon-1' },
    ],
    tuesday: null,
    wednesday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-wed-1' },
    ],
    thursday: null,
    friday: [
      { opening: '2026-01-15T09:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-fri-1' },
    ],
    saturday: [
      { opening: '2026-01-15T10:00:00.000Z', closing: '2026-01-15T19:00:00.000Z', id: 'oh-sat-1' },
    ],
    sunday: [
      { opening: '2026-01-15T10:00:00.000Z', closing: '2026-01-15T18:00:00.000Z', id: 'oh-sun-1' },
    ],
    notes: 'Martedi e giovedi apertura solo su prenotazione per i servizi.',
  },
  // Service markers now live in the saved map scene graph, so the museum page
  // renders its badges from `map` instead of a Payload field.
  map: createRealisticMuseumMap('museum-services-001', { unplacedService: 'shop' }),
})
