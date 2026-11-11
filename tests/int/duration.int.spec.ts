import { describe, expect, it } from 'vitest'
import { estimateSeconds, formatDuration, toMinutes, wordsForSeconds } from '@/lib/duration'
import { expansionPrompt } from '@/lib/expansion-prompt'

/**
 * Item lengths in seconds (requirement 3 of `docs/plan/requisiti-18-33.md`):
 * the specification's items last from a few seconds to several minutes, so
 * lengths are exact, labelled compactly, and generated versions are asked
 * for in seconds.
 */
describe('item length', () => {
  it('estimates the read-aloud time from the words', () => {
    expect(estimateSeconds('')).toBe(0)
    // "La Gioconda, by Leonardo": a 3-second item.
    expect(estimateSeconds('La Gioconda, by Leonardo')).toBe(2)
    expect(estimateSeconds(Array(150).fill('word').join(' '))).toBe(60)
  })

  it("labels seconds and minutes in the visitor's language", () => {
    expect(formatDuration(15, 'en')).toBe('15 sec')
    expect(formatDuration(90, 'en')).toBe('1 min 30 sec')
    expect(formatDuration(300, 'en')).toBe('5 min')
    expect(formatDuration(754, 'en')).toBe('12 min')
    // Units follow the visitor's language.
    expect(formatDuration(90, 'it')).toBe('1 min 30 s')
  })

  it('converts to whole minutes for tours and the planner', () => {
    expect(toMinutes(null)).toBe(0)
    expect(toMinutes(15)).toBe(1)
    expect(toMinutes(150)).toBe(3)
  })

  it('asks the model for a version of a given number of seconds', () => {
    const prompt = expansionPrompt({
      request: { kind: 'version', difficulty: 'easy', seconds: 15, audience: 'everyone' },
      subject: 'A knight in motion',
      text: 'Few Gothic paintings move like this one.',
      language: 'English',
      links: [],
      sources: [],
    })
    expect(prompt.prompt).toContain(`about ${wordsForSeconds(15)} words`)
  })
})
