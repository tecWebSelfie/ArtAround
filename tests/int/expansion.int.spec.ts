import { describe, expect, it } from 'vitest'
import {
  finishedParagraphs,
  inlineParts,
  keepKnownLinks,
  linkedIds,
  speakableText,
} from '@/lib/expansion'

// "Tell me more" text rules (src/lib/expansion.ts), shared by /api/expand and
// the modal renderer.
const text =
  'The **Long Neck** is a [Madonna](/object/abc123) and a [fake](/object/zzz).\n\nSecond paragraph.\n\nStill wri'

describe('expansion text', () => {
  it('shows only finished paragraphs while streaming, all of them at the end', () => {
    expect(finishedParagraphs(text, false)).toHaveLength(2)
    expect(finishedParagraphs(text, true)).toHaveLength(3)
  })

  it('keeps links to known museum entities only', () => {
    const kept = keepKnownLinks(text, new Set(['abc123']))
    expect(kept).toContain('[Madonna](/object/abc123)')
    expect(kept).toContain('a fake.')
    expect(linkedIds(kept)).toEqual(['abc123'])
  })

  it('splits a paragraph into text, bold and link parts and reads it as plain words', () => {
    const [first] = finishedParagraphs(text, true)
    expect(inlineParts(first).map((part) => part.type)).toEqual([
      'text',
      'text',
      'text',
      'link',
      'text',
      'link',
      'text',
    ])
    expect(speakableText(first)).toBe('The Long Neck is a Madonna and a fake.')
  })
})

// "Tell me more" goes on (requirement 6 of docs/plan/requisiti-18-33.md):
// each step is saved on its own and written knowing the earlier ones.
describe('progressive "Tell me more"', async () => {
  const { expansionPrompt } = await import('@/lib/expansion-prompt')
  const { previousStepsWhere, variantWhere } = await import('@/lib/expansion-variants')

  it('looks up each step on its own, older additions counting as the first', () => {
    const first = variantWhere('contents', 'c1', { kind: 'more', angle: 'story' })
    expect(JSON.stringify(first)).toContain('"exists":false')
    const third = variantWhere('contents', 'c1', { kind: 'more', angle: 'story', step: 3 })
    expect(third.and).toContainEqual({ step: { equals: 3 } })
    expect(previousStepsWhere('contents', 'c1', 'story', 3).and).toContainEqual({
      or: [{ step: { less_than: 3 } }, { step: { exists: false } }],
    })
  })

  it('tells the model what the visitor has already read', () => {
    const base: Parameters<typeof expansionPrompt>[0] = {
      request: { kind: 'more', angle: 'more', step: 2 },
      language: 'English',
      subject: 'Ecstasy of Saint Cecilia',
      text: 'Saint Cecilia lowers her organ.',
      links: [],
      sources: [],
    }
    const prompt = expansionPrompt({ ...base, alreadyRead: ['The instruments at her feet.'] })
    expect(prompt.prompt).toContain('already read the original text and these additions')
    expect(prompt.prompt).toContain('Addition 1:\nThe instruments at her feet.')
    expect(expansionPrompt(base).prompt).not.toContain('Addition 1')
  })
})
