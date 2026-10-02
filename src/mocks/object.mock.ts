import type { Object, ObjectsThumbnail } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

function baseThumbnail(): ObjectsThumbnail {
  return {
    id: 'object-thumb-1',
    alt: 'Veduta frontale del reperto',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    url: '/thumbnails/object-frontal.jpg',
    filename: 'object-frontal.jpg',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
  }
}

function baseObject(): Object {
  return {
    id: 'object-001',
    name: 'Anfora a figure rosse',
    description: 'Anfora attica a figure rosse con scena di banchetto, databile al V secolo a.C.',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
  }
}

export function createObject(overrides?: Partial<Object>): Object {
  return { ...baseObject(), ...overrides }
}

export const mockObjectMinimal: Object = createObject()

export const mockObjectFull: Object = createObject({
  id: 'object-full-001',
  name: 'Statua in marmo di atleta',
  description:
    'Statua in marmo pario raffigurante un atleta nell’atto di lanciare il disco, copia romana da originale greco del V secolo a.C.',
  exhibit: {
    docs: ['exhibit-1'],
    totalDocs: 1,
    hasNextPage: false,
  },
  contents: ['content-1', 'content-2'],
  thumbnail: baseThumbnail(),
  lfrs: {
    favouritesCount: 42,
    sharesCount: 7,
  },
})

export const mockObjectNoMedia: Object = createObject({
  id: 'object-nomedia-001',
  thumbnail: null,
})

export const mockObjectNoContents: Object = createObject({
  id: 'object-nocontents-001',
  contents: null,
  exhibit: {
    docs: ['exhibit-1'],
    totalDocs: 1,
    hasNextPage: false,
  },
  thumbnail: baseThumbnail(),
})

export const mockObjectNoDescription: Object = createObject({
  id: 'object-nodesc-001',
  description: null,
})

export const mockObjectAmphora: Object = createObject({
  id: 'object-1',
  name: 'Anfora a figure rosse',
  description: 'Anfora attica a figure rosse con scena di banchetto, databile al V secolo a.C.',
  thumbnail: {
    id: 'object-thumb-1',
    alt: 'Veduta frontale del reperto',
    url: '/thumbnails/object-frontal.jpg',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
  },
})

export const mockObjectStatue: Object = createObject({
  id: 'object-2',
  name: 'Statua in marmo di atleta',
  description:
    'Statua in marmo pario raffigurante un atleta nell’atto di lanciare il disco, copia romana da originale greco del V secolo a.C.',
  thumbnail: {
    id: 'object-thumb-2',
    alt: 'Statua in marmo di atleta',
    url: '/thumbnails/object-statue.jpg',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
  },
})

export const mockObjectMosaicNoThumbnail: Object = createObject({
  id: 'object-3',
  name: 'Mosaico pavimentale',
  description: 'Frammento di mosaico pavimentale con motivo geometrico in tessere bianche e nere.',
  thumbnail: null,
})

export const mockObjectsList: Object[] = [
  mockObjectAmphora,
  mockObjectStatue,
  mockObjectMosaicNoThumbnail,
]
