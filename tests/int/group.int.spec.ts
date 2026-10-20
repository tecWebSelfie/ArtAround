import { describe, expect, it } from 'vitest'
import {
  followHref,
  groupLocation,
  isQuizLocation,
  normalizeRoomCode,
  ROOM_CODE_PATTERN,
} from '@/lib/group'

// The group-tour follow rules (src/lib/group.ts): what the host shares and
// where a guest goes, keeping the guest's own language and reading choices.
describe('group tours', () => {
  it('normalizes typed codes and rejects ambiguous letters', () => {
    expect(normalizeRoomCode(' ab3 x-9k ')).toBe('AB3X9K')
    expect(ROOM_CODE_PATTERN.test('AB3X9K')).toBe(true)
    expect(ROOM_CODE_PATTERN.test('AB0X9K')).toBe(false)
  })

  it('shares only the position and destination, without the language', () => {
    const search = new URLSearchParams('at=1&to=2&mobility=wheelchair&level=easy&more=story')
    expect(groupLocation('/en/tour/t1/navigation/3/content/c9', search)).toBe(
      '/tour/t1/navigation/3/content/c9?at=1&to=2',
    )
  })

  it('follows in the guest language and keeps personal settings', () => {
    const own = new URLSearchParams('mobility=wheelchair&level=easy')
    // Same modal: reading options stay.
    expect(
      followHref(
        '/tour/t1/navigation/3/content/c9?at=1',
        'it',
        '/it/tour/t1/navigation/3/content/c9',
        own,
      ),
    ).toBe('/it/tour/t1/navigation/3/content/c9?at=1&mobility=wheelchair&level=easy')
    // New modal: reading options reset, wheelchair route stays.
    expect(
      followHref(
        '/tour/t1/navigation/4/content/c10?at=1',
        'it',
        '/it/tour/t1/navigation/3/content/c9',
        own,
      ),
    ).toBe('/it/tour/t1/navigation/4/content/c10?at=1&mobility=wheelchair')
  })

  it('recognizes the group quiz', () => {
    expect(isQuizLocation('/tour/t1/quiz', 't1')).toBe(true)
    expect(isQuizLocation('/tour/t1/quiz/result/abc', 't1')).toBe(true)
    expect(isQuizLocation('/tour/t1/navigation/2', 't1')).toBe(false)
  })
})
