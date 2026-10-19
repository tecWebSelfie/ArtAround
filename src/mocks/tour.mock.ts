import { mockContentsList } from '@/mocks/content.mock'
import type { Tour, ToursThumbnail } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

function baseThumbnail(id: string, seed: string): ToursThumbnail {
  return {
    id,
    alt: 'Tour thumbnail image',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    url: `https://picsum.photos/seed/${seed}/600/400`,
    filename: `${seed}.jpg`,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
  }
}

function baseTour(): Tour {
  return {
    id: 'tour-001',
    title: 'La Monna Lisa e i suoi misteri',
    description: 'Un percorso tra le sale rinascimentali alla scoperta dei segreti della Gioconda.',
    contents: ['content-001', 'content-002'],
    museum: 'museum-001',
    author: 'user-001',
    lfrs: {
      favouritesCount: 18,
      sharesCount: 4,
    },
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    thumbnail: baseThumbnail('thumbnail-001', 'tour-1'),
  }
}

export function createTour(overrides?: Partial<Tour>): Tour {
  const base = baseTour()
  return {
    ...base,
    ...overrides,
    thumbnail: overrides && 'thumbnail' in overrides ? overrides.thumbnail : base.thumbnail,
  }
}

export const mockTourMinimal: Tour = createTour()

export const mockTourFull: Tour = createTour({
  id: 'tour-full-001',
  title: 'Capolavori del Rinascimento',
  description:
    'Il meglio delle collezioni rinascimentali in un itinerario di un’ora tra dipinti, sculture e disegni.',
  contents: mockContentsList,
  lfrs: {
    favouritesCount: 128,
    ratingsCount: 64,
    ratingsAverage: 4.7,
    sharesCount: 21,
  },
  thumbnail: baseThumbnail('thumbnail-full-001', 'tour-full'),
})

// Populated contents for TourPage stories (TourPage renders `filterPopulated(tour.contents)`).
export const mockTourWithContents: Tour = createTour({
  id: 'tour-with-contents-001',
  title: 'La Monna Lisa e i suoi misteri',
  contents: mockContentsList,
})

export const mockTourSecond: Tour = createTour({
  id: 'tour-002',
  title: 'I segreti del Colosseo',
  description: 'Dai sotterranei all’arena: storia e curiosità del monumento simbolo di Roma.',
  contents: ['content-002'],
  thumbnail: baseThumbnail('thumbnail-002', 'tour-2'),
})

export const mockTourThird: Tour = createTour({
  id: 'tour-003',
  title: 'Mosaici e geometrie antiche',
  description: 'Tessere bianche e nere: motivi geometrici e scene mitologiche nei mosaici romani.',
  contents: ['content-003'],
  thumbnail: baseThumbnail('thumbnail-003', 'tour-3'),
})

export const mockTourNoThumbnail: Tour = createTour({
  id: 'tour-nothumb-001',
  thumbnail: null,
})

export const mockTourNoDescription: Tour = createTour({
  id: 'tour-nodesc-001',
  description: null,
})

export const mockTourNoContents: Tour = createTour({
  id: 'tour-nocontents-001',
  contents: [],
})

export const mockToursList: Tour[] = [mockTourMinimal, mockTourSecond, mockTourThird]
