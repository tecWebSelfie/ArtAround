import { mockObjectsList } from '@/mocks/object.mock'
import type { Museum } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

function baseMuseum(): Museum {
  return {
    id: 'museum-001',
    name: 'Museo Civico di Esempio',
    shortDescription: 'Breve descrizione del museo in meno di cento caratteri.',
    accessibility: true,
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
  }
}

export function createMuseum(overrides?: Partial<Museum>): Museum {
  return { ...baseMuseum(), ...overrides }
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
  accessibility: true,
  map: {
    id: 'map-001',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    url: '/maps/museum-map.png',
    filename: 'museum-map.png',
    mimeType: 'image/png',
    width: 1600,
    height: 1200,
  },
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
      url: '/thumbnails/museum-facade.jpg',
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
      url: '/thumbnails/museum-hall.jpg',
      filename: 'museum-hall.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
    },
  ],
  exhibits: ['exhibit-1', 'exhibit-2'],
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
  services: {
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
  accessibility: true,
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
