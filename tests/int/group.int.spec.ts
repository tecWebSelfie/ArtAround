import { describe, expect, it } from 'vitest'
import {
  followHref,
  groupLocation,
  isQuizLocation,
  isTourLocation,
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
    expect(groupLocation('/en/museum/m1/navigation/tour/t1/3/content/c9', search)).toBe(
      '/museum/m1/navigation/tour/t1/3/content/c9?at=1&to=2',
    )
  })

  it('follows in the guest language and keeps personal settings', () => {
    const own = new URLSearchParams('mobility=wheelchair&level=easy')
    // Same modal: reading options stay.
    expect(
      followHref(
        '/museum/m1/navigation/tour/t1/3/content/c9?at=1',
        'it',
        '/it/museum/m1/navigation/tour/t1/3/content/c9',
        own,
      ),
    ).toBe('/it/museum/m1/navigation/tour/t1/3/content/c9?at=1&mobility=wheelchair&level=easy')
    // New modal: reading options reset, wheelchair route stays.
    expect(
      followHref(
        '/museum/m1/navigation/tour/t1/4/content/c10?at=1',
        'it',
        '/it/museum/m1/navigation/tour/t1/3/content/c9',
        own,
      ),
    ).toBe('/it/museum/m1/navigation/tour/t1/4/content/c10?at=1&mobility=wheelchair')
  })

  it('recognizes the group quiz', () => {
    expect(isQuizLocation('/tour/t1/quiz', 't1')).toBe(true)
    expect(isQuizLocation('/tour/t1/quiz/result/abc', 't1')).toBe(true)
    expect(isQuizLocation('/museum/m1/navigation/tour/t1/2', 't1')).toBe(false)
  })

  // The host publishes only locations of the group's tour (GroupSync).
  it('recognizes the tour locations the host publishes', () => {
    expect(isTourLocation('/museum/m1/navigation/tour/t1', 't1')).toBe(true)
    expect(isTourLocation('/museum/m1/navigation/tour/t1/3/content/c9?at=1', 't1')).toBe(true)
    expect(isTourLocation('/tour/t1/quiz', 't1')).toBe(true)
    // Pre-phase-2 shape (redirected to the museum one).
    expect(isTourLocation('/tour/t1/navigation/2', 't1')).toBe(true)
    expect(isTourLocation('/museum/m1/navigation/tour/t10/2', 't1')).toBe(false)
    expect(isTourLocation('/museum/m1/navigation', 't1')).toBe(false)
    expect(isTourLocation('/tour/t1', 't1')).toBe(false)
  })
})
