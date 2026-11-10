import { describe, expect, it } from 'vitest'
import { expansionPrompt } from '@/lib/expansion-prompt'
import { variantWhere, previousStepsWhere } from '@/lib/expansion-variants'
import { groupLocation, followHref } from '@/lib/group'
import { readingAge, setReadingProfile, plannedChildrenAges } from '@/lib/reading-profile'
import { withNavigationPosition } from '@/lib/tour-navigation'

/** Family readers share an artwork while their exact age stays device-local. */
describe('synchronized family reading', () => {
  const host = '/en/museum/m/navigation/tour/t/0/content/c'
  it('follows the same work in three personal profiles, then keeps age at the next stop', () => {
    const shared = groupLocation(host, new URLSearchParams('audience=children&age=5&at=work'))
    expect(shared).not.toContain('age=')
    for (const age of [null, '5', '8']) {
      const query = new URLSearchParams()
      setReadingProfile(query, age ?? 'adult')
      const followed = followHref(shared, 'it', '/it/room/AB3X9K', query)
      expect(followed).toContain('/content/c?at=work')
      expect(new URL(followed, 'http://local').searchParams.get('age')).toBe(age)
      const next = withNavigationPosition(
        '/it/museum/m/navigation/tour/t/1',
        new URL(followed, 'http://local').searchParams.toString(),
      )
      expect(new URL(next, 'http://local').searchParams.get('age')).toBe(age)
    }
  })
  it('separates age-specific requests and generic children in prompts and saved variants', () => {
    const version = {
      kind: 'version',
      difficulty: 'easy',
      seconds: 60,
      audience: 'children',
    } as const
    const prompt = (age?: number) =>
      expansionPrompt({
        request: { ...version, age },
        language: 'Italian',
        subject: 'The same work',
        text: 'Verified museum facts.',
        links: [],
        sources: [],
      }).prompt
    expect(prompt(5)).toContain('child aged 5')
    expect(prompt(8)).toContain('child aged 8')
    expect(prompt(5)).toContain('same artwork and facts as the adults')
    expect(variantWhere('contents', 'c', { ...version, age: 5 })).not.toEqual(
      variantWhere('contents', 'c', { ...version, age: 8 }),
    )
    expect(variantWhere('contents', 'c', version)).not.toEqual(
      variantWhere('contents', 'c', { ...version, age: 5 }),
    )
    expect(previousStepsWhere('contents', 'c', 'more', 2, 5)).not.toEqual(
      previousStepsWhere('contents', 'c', 'more', 2, 8),
    )
  })
  it('validates ages and removes child parameters when choosing an adult reader', () => {
    expect(readingAge('0')).toBe(0)
    for (const invalid of ['18', '-1', '5.5', '', 'adult'])
      expect(readingAge(invalid)).toBeUndefined()
    const query = new URLSearchParams('audience=children&age=8&mobility=wheelchair')
    setReadingProfile(query, 'adult')
    expect(query.toString()).toBe('mobility=wheelchair')
    expect(
      plannedChildrenAges({
        childrenAges: [8, 5, 5, -1, 99, '8'],
        interests: 'Never sent to guests',
      }),
    ).toEqual([5, 8])
  })
})
