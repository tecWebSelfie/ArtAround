import { describe, expect, it } from 'vitest'
import { addRequests, parseRequests, requestsInUrl, stopOfLocation } from '@/lib/group-requests'

/**
 * "Who asked what" (requirement 9 of `docs/plan/requisiti-18-33.md`): what a
 * guest's URL asks for, at which stop, and the compact attribute the host
 * reads.
 */
describe('group requests', () => {
  it('reads the requests from the guest’s reading options', () => {
    expect(requestsInUrl(new URLSearchParams('more=curiosities&step=2'))).toEqual(['curiosities'])
    expect(requestsInUrl(new URLSearchParams('level=easy&seconds=30&audience=children'))).toEqual([
      'level:easy',
      'shorter',
      'children',
    ])
    expect(requestsInUrl(new URLSearchParams('at=o1&mobility=wheelchair'))).toEqual([])
  })

  it('knows the stop from the group location', () => {
    expect(stopOfLocation('/museum/m1/navigation/tour/t1/3/open?more=story')).toBe(3)
    expect(stopOfLocation('/tour/t1/quiz')).toBeNull()
  })

  it('counts each request once per stop and survives a malformed attribute', () => {
    const first = addRequests([], ['more', 'shorter'], 2, 1000)!
    expect(first).toHaveLength(2)
    expect(addRequests(first, ['more'], 2, 2000)).toBeNull()
    expect(addRequests(first, ['more'], 3, 2000)).toHaveLength(3)
    expect(parseRequests(JSON.stringify(first))).toEqual(first)
    expect(parseRequests('not json')).toEqual([])
  })
})
