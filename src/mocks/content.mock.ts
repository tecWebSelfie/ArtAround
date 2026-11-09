import type { Content } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

/** A one-paragraph Lexical body: for stories, and for specs that need a content's text. */
export function mockBody(text: string): Content['body'] {
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
    license: 'cc-by-sa',
    images: null,
    objects: {
      docs: ['object-1'],
      totalDocs: 1,
      hasNextPage: false,
    },
    // Free by default; paid fixtures override `price` (euro cents).
    price: null,
    author: 'user-001',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
  }
}

export function createContent(overrides?: Partial<Content>): Content {
  return { ...baseContent(), ...overrides }
}

export const mockContentMinimal: Content = createContent({
  durationSeconds: 45,
})

export const mockContentSecond: Content = createContent({
  id: 'content-002',
  difficulty: 'medium',
  title: 'Il restauro del bronzo',
  body: mockBody('Come si restaura una statua in bronzo: pulitura, consolidamento e integrazione.'),
  license: 'cc-by-sa',
  durationSeconds: 150,
})

export const mockContentThird: Content = createContent({
  id: 'content-003',
  difficulty: 'hard',
  title: 'Leggere un dipinto rinascimentale',
  body: mockBody('Iconografia, prospettiva e committenza nella pittura del Rinascimento.'),
  license: 'cc-by-sa',
  durationSeconds: 480,
})

export const mockContentsList: Content[] = [mockContentMinimal, mockContentSecond, mockContentThird]
