// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MIN_VISIBLE_MS,
  SAFETY_TIMEOUT_MS,
  SHOW_DELAY_MS,
  beginNavigation,
  endAllNavigations,
  navigationProgressStore,
} from '@/lib/navigation-progress'

/**
 * Timing rules of the global navigation bar (src/lib/navigation-progress.ts):
 * no flash for fast navigations, a minimum time once shown, one bar for
 * overlapping navigations, and a safety timeout that never fakes 100%.
 */

const visible = () => navigationProgressStore.getState().mounted
const progress = () => navigationProgressStore.getState().progress

describe('navigation progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    navigationProgressStore.initialize({
      mounted: false,
      progress: 0,
      interval: -1,
      step: 1,
      stepInterval: 500,
      timeouts: [],
    })
  })
  afterEach(() => {
    endAllNavigations()
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('never shows the bar for a navigation that ends before the delay', () => {
    const end = beginNavigation()
    vi.advanceTimersByTime(SHOW_DELAY_MS - 1)
    end()
    vi.advanceTimersByTime(SAFETY_TIMEOUT_MS)
    expect(visible()).toBe(false)
  })

  it('shows the bar after the delay and keeps it up for the minimum time', () => {
    const end = beginNavigation()
    vi.advanceTimersByTime(SHOW_DELAY_MS)
    expect(visible()).toBe(true)
    end()
    // Ended right after appearing: still visible until the minimum elapses.
    vi.advanceTimersByTime(MIN_VISIBLE_MS - 10)
    expect(visible()).toBe(true)
    vi.advanceTimersByTime(10)
    expect(progress()).toBe(100)
    vi.advanceTimersByTime(100)
    expect(visible()).toBe(false)
  })

  it('keeps one bar until every overlapping navigation ends', () => {
    const first = beginNavigation()
    const second = beginNavigation()
    vi.advanceTimersByTime(SHOW_DELAY_MS + MIN_VISIBLE_MS)
    first()
    first() // idempotent: a second call must not end the other navigation
    vi.advanceTimersByTime(100)
    expect(visible()).toBe(true)
    second()
    vi.advanceTimersByTime(100)
    expect(visible()).toBe(false)
  })

  it('takes a forgotten bar away at the safety timeout without reaching 100%', () => {
    beginNavigation()
    vi.advanceTimersByTime(SAFETY_TIMEOUT_MS - 1)
    expect(visible()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(visible()).toBe(false)
    expect(progress()).toBe(0)
  })

  it('ends every open navigation when the URL commits', () => {
    beginNavigation()
    beginNavigation()
    vi.advanceTimersByTime(SHOW_DELAY_MS + MIN_VISIBLE_MS)
    endAllNavigations()
    vi.advanceTimersByTime(100)
    expect(visible()).toBe(false)
  })
})
