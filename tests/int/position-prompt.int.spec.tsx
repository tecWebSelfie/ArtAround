// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/mocks/i18n'
import { ExitEntranceNode } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import {
  useNamedEntrances,
  usePositionPrompt,
} from '@/app/[lng]/(frontend)/museum/[id]/navigation/use-tour-navigation'

/**
 * "Where are you?" (`usePositionPrompt`, `useNamedEntrances`): which
 * entrances it offers, what it calls them, and how it remembers being
 * folded (`@/mocks/i18n`: the English strings, interpolated).
 */
afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const entrance = (
  fields: Partial<{ name: string; placed: boolean; direction: 'entrance' | 'exit' }>,
) => ExitEntranceNode.parse({ direction: 'entrance', placed: true, ...fields })

describe('useNamedEntrances', () => {
  it('offers only placed entrances, never exits or unplaced markers', () => {
    const markers = [
      entrance({ name: 'Main door' }),
      entrance({ name: 'Not on the map yet', placed: false }),
      entrance({ name: 'Way out', direction: 'exit' }),
    ]
    const { result } = renderHook(() => useNamedEntrances(markers))
    expect(result.current.map(({ name }) => name)).toEqual(['Main door'])
    expect(result.current[0].id).toBe(markers[0].id)
  })

  // Regression: nameless entrances were numbered by their place among all
  // entrances, so a named one in between left a gap ("Entrance 1", "Entrance 3").
  it('numbers nameless entrances among themselves, only when there are several', () => {
    const one = renderHook(() => useNamedEntrances([entrance({})]))
    expect(one.result.current.map(({ name }) => name)).toEqual(['Entrance'])
    const several = renderHook(() =>
      useNamedEntrances([entrance({}), entrance({ name: 'Garden' }), entrance({})]),
    )
    expect(several.result.current.map(({ name }) => name)).toEqual([
      'Entrance 1',
      'Garden',
      'Entrance 2',
    ])
  })
})

describe('usePositionPrompt', () => {
  const props = {
    museumId: 'm1',
    entrances: [{ id: 'e1', name: 'Main door' }],
    onEntrance: vi.fn(),
    onScan: vi.fn(),
  }

  it('is never offered to a group guest, whose position is the host’s', () => {
    const { result } = renderHook(() => usePositionPrompt({ ...props, guest: true }))
    expect(result.current).toBeUndefined()
  })

  it('opens at first and stays folded in the tab for that museum once hidden', () => {
    const { result } = renderHook(() => usePositionPrompt({ ...props, guest: false }))
    expect(result.current?.opened).toBe(true)
    act(() => result.current?.onOpenedChange(false))
    expect(result.current?.opened).toBe(false)
    // Another mount in the same tab (a reload, the shell re-rendering) keeps it folded…
    const again = renderHook(() => usePositionPrompt({ ...props, guest: false }))
    expect(again.result.current?.opened).toBe(false)
    // …while another museum opens it afresh.
    const other = renderHook(() => usePositionPrompt({ ...props, museumId: 'm2', guest: false }))
    expect(other.result.current?.opened).toBe(true)
  })
})
