import type { Tour, ToursThumbnail } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

export function createTour(overrides?: Partial<Tour>): Tour {
  return {
    id: 'tour-001',
    title: 'La monnalisa e i suoi misteri',
    contents: [],
    museum: {
      docs: [],
      hasNextPage: false,
    },
    author: {
      docs: [],
      hasNextPage: false,
    },
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    ...overrides,
    thumbnail: {
      alt: 'Tour thumbnail image',
      id: 'thumbnail-001',
      url: 'https://picsum.photos/200/300',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    } satisfies ToursThumbnail,
  }
}

export const mockTourMinimal: Tour = createTour()

export const mockTourSecond: Tour = createTour({
  id: 'tour-002',
})

export const mockTourThird: Tour = createTour({
  id: 'tour-003',
})

export const mockToursList: Tour[] = [mockTourMinimal, mockTourSecond, mockTourThird]
