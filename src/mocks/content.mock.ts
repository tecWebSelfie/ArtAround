import type { Content } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

function mockBody(text: string): Content['body'] {
  return {
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
              text,
            },
          ],
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function baseContent(): Content {
  return {
    id: 'content-001',
    difficulty: 'easy',
    title: 'Storia della ceramica attica',
    body: mockBody('Introduzione alla ceramica attica a figure rosse e alle sue tecniche.'),
    copyright: '© Museo Civico di Esempio',
    pricing: { currency: 'eur' },
    images: null,
    objects: {
      docs: ['object-1'],
      totalDocs: 1,
      hasNextPage: false,
    },
    author: {
      docs: [],
      totalDocs: 0,
      hasNextPage: false,
    },
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
  }
}

export function createContent(overrides?: Partial<Content>): Content {
  return { ...baseContent(), ...overrides }
}

export const mockContentMinimal: Content = createContent({
  readingTimeMins: 3,
})

export const mockContentSecond: Content = createContent({
  id: 'content-002',
  difficulty: 'medium',
  title: 'Il restauro del bronzo',
  body: mockBody('Come si restaura una statua in bronzo: pulitura, consolidamento e integrazione.'),
  copyright: '© Museo Civico di Esempio',
  readingTimeMins: 5,
})

export const mockContentThird: Content = createContent({
  id: 'content-003',
  difficulty: 'hard',
  title: 'Leggere un dipinto rinascimentale',
  body: mockBody('Iconografia, prospettiva e committenza nella pittura del Rinascimento.'),
  copyright: '© Museo Civico di Esempio',
  readingTimeMins: 8,
})

export const mockContentsList: Content[] = [mockContentMinimal, mockContentSecond, mockContentThird]
