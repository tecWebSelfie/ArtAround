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
