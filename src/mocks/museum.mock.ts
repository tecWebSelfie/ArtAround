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

const DEFAULT_MAP_OPTIONS: MuseumMapOptions = {
  width: 12,
  depth: 8,
  partitions: [{ start: [6, 0], end: [6, 8] }],
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
    tours: mockToursList,
    thumbnails: [
      {
        alt: 'Facciata del museo',
        id: 'thumb-1',
        updatedAt: TIMESTAMP,
        createdAt: TIMESTAMP,
        url: 'https://picsum.photos/200/300',
      },
    ] satisfies MuseumThumbnail[],
    objects: mockObjectsList,
  }
}

export function createMuseum(overrides?: Partial<Museum>): Museum {
  const museum = { ...baseMuseum(), ...overrides }
  if (overrides?.map === undefined) {
    museum.map = createMuseumMap(museum.id, DEFAULT_MAP_OPTIONS)
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
      url: 'https://picsum.photos/200/300',
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
      url: 'https://picsum.photos/200/300',
      filename: 'museum-hall.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
    },
  ],
  objects: mockObjectsList,
  openingHours: {
    monday: [{ opening: '09:00', closing: '18:00', id: 'oh-mon-1' }],
    tuesday: [{ opening: '09:00', closing: '18:00', id: 'oh-tue-1' }],
    wednesday: [{ opening: '09:00', closing: '18:00', id: 'oh-wed-1' }],
    thursday: [{ opening: '09:00', closing: '20:00', id: 'oh-thu-1' }],
    friday: [{ opening: '09:00', closing: '18:00', id: 'oh-fri-1' }],
    saturday: [{ opening: '10:00', closing: '19:00', id: 'oh-sat-1' }],
    sunday: [{ opening: '10:00', closing: '18:00', id: 'oh-sun-1' }],
    notes: null,
  },
  /*   services: {
    bathrooms: [
      {
        coordinates: { x: 10, y: 20 },
        id: 'service-bath-1',
      },
    ],
    food: [
      {
        coordinates: { x: 30, y: 40 },
        id: 'service-food-1',
      },
    ],
    shop: [
      {
        coordinates: { x: 50, y: 60 },
        id: 'service-shop-1',
      },
    ],
    infoPoint: [
      {
        coordinates: { x: 5, y: 5 },
        id: 'service-info-1',
      },
    ],
  }, */
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
  map: createMuseumMap('museum-uffizi-001', {
    width: 24,
    depth: 8,
    partitions: [
      { start: [8, 0], end: [8, 8] },
      { start: [16, 0], end: [16, 8] },
    ],
  }),
})

export const mockMuseumBrera: Museum = createMuseum({
  id: 'museum-brera-001',
  name: 'Pinacoteca di Brera',
  shortDescription: 'Capolavori della pittura italiana dal Trecento al Novecento.',
  map: createMuseumMap('museum-brera-001', {
    width: 16,
    depth: 14,
    partitions: [
      { start: [8, 0], end: [8, 14] },
      { start: [8, 7], end: [16, 7] },
    ],
  }),
})

export const mockMuseumClosed: Museum = createMuseum({
  id: 'museum-closed-001',
  openingHours: {
    monday: [{ opening: '09:00', closing: '18:00', id: 'oh-mon-1' }],
    tuesday: [{ opening: '09:00', closing: '18:00', id: 'oh-tue-1' }],
    wednesday: [{ opening: '09:00', closing: '18:00', id: 'oh-wed-1' }],
    thursday: [{ opening: '09:00', closing: '18:00', id: 'oh-thu-1' }],
    friday: [{ opening: '09:00', closing: '18:00', id: 'oh-fri-1' }],
    saturday: [{ opening: '10:00', closing: '13:00', id: 'oh-sat-1' }],
    sunday: null,
    notes: 'Chiuso la domenica e nei giorni festivi.',
  },
})

export const mockMuseumWithServices: Museum = createMuseum({
  id: 'museum-services-001',
  accessibility: { isAccessible: true },
  openingHours: {
    monday: [{ opening: '09:00', closing: '18:00', id: 'oh-mon-1' }],
    tuesday: null,
    wednesday: [{ opening: '09:00', closing: '18:00', id: 'oh-wed-1' }],
    thursday: null,
    friday: [{ opening: '09:00', closing: '18:00', id: 'oh-fri-1' }],
    saturday: [{ opening: '10:00', closing: '19:00', id: 'oh-sat-1' }],
    sunday: [{ opening: '10:00', closing: '18:00', id: 'oh-sun-1' }],
    notes: 'Martedi e giovedi apertura solo su prenotazione per i servizi.',
  },
  services: {
    bathrooms: [
      {
        openingHours: {
          monday: [{ opening: '09:00', closing: '18:00', id: 'bath-mon-1' }],
          sunday: null,
          notes: null,
        },
        coordinates: { x: 10, y: 20 },
        id: 'service-bath-1',
      },
    ],
    food: [
      {
        openingHours: {
          monday: [{ opening: '12:00', closing: '15:00', id: 'food-mon-1' }],
          notes: 'Bar aperto solo a pranzo.',
        },
        coordinates: { x: 30, y: 40 },
        id: 'service-food-1',
      },
    ],
    infoPoint: [
      {
        coordinates: { x: 5, y: 5 },
        id: 'service-info-1',
      },
    ],
  },
})
