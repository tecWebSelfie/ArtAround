// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Museum } from '@/payload-types'
import { ExitEntranceNode } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import { ServiceNode } from '@/lib/pascal/museum-plugin/ServiceNode'
import type { NavigationScope } from '@/lib/tour-navigation'
import { useNavigationCommands } from '@/app/[lng]/(frontend)/museum/[id]/navigation/navigation-commands'

/**
 * The navigation commands follow the navigation state: a command that would
 * change nothing now (reopen the open stop, reselect the active destination
 * or reading option, a "Tell me more" angle at its last step, Scan on the
 * scanner) is left out, so the Spotlight, the overlay and the voice
 * assistant (same list) can't run it. The URL is the boundary: Next's
 * navigation hooks are faked with the state under test.
 */
const url = vi.hoisted(() => ({ pathname: '', search: '' }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ lng: 'en' }),
  usePathname: () => url.pathname,
  useSearchParams: () => new URLSearchParams(url.search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
afterEach(cleanup)

const base = '/en/museum/m1/navigation/tour/t1/0'
const scope: NavigationScope = {
  kind: 'tour',
  tour: { id: 't1', museum: 'm1', contents: ['c1', 'c2'] },
  step: 0,
}
const catalog = [
  { id: 'o1', name: 'Work one', contents: [{ id: 'c1', title: 'Stop one' }] },
  { id: 'o2', name: 'Work two', contents: [{ id: 'c2', title: 'Stop two' }] },
]
const services = [ServiceNode.parse({ service: 'bathrooms', placed: true })]
const exits = [ExitEntranceNode.parse({ direction: 'exit', placed: true })]

function idsAt(pathname: string, search = '') {
  Object.assign(url, { pathname, search })
  const { result } = renderHook(() =>
    useNavigationCommands({ museum: {} as Museum, scope, catalog, services, exits }),
  )
  return result.current.commands.map(({ id }) => id)
}

describe('commands that follow the navigation state', () => {
  it('offers the next stop on the map, not while that stop is open', () => {
    expect(idsAt(base)).toContain('next-stop')
    expect(idsAt(`${base}/open`)).not.toContain('next-stop')
  })

  it('asks "what is this?" only on an open content', () => {
    expect(idsAt(base, 'at=o1')).not.toContain('what-is-this')
    expect(idsAt(`${base}/open`)).toContain('what-is-this')
    expect(idsAt(`${base}/object/o1`)).not.toContain('what-is-this')
  })

  it('leaves out the destination the route already leads to', () => {
    expect(idsAt(base)).toEqual(expect.arrayContaining(['service-type:bathrooms', 'exit:nearest']))
    expect(idsAt(base, 'service=bathrooms')).not.toContain('service-type:bathrooms')
    expect(idsAt(base, 'exit=nearest')).not.toContain('exit:nearest')
  })

  it('leaves out the reading option already shown and an exhausted angle', () => {
    const open = `${base}/open`
    expect(idsAt(open)).not.toContain('version:original')
    expect(idsAt(open, 'level=easy')).toEqual(
      expect.arrayContaining(['version:original', 'version:harder']),
    )
    expect(idsAt(open, 'level=easy')).not.toContain('version:simpler')
    expect(idsAt(open, 'more=more')).toContain('more:more')
    expect(idsAt(open, 'more=more&step=99')).not.toContain('more:more')
  })

  it('leaves Scan out on the scanner itself', () => {
    expect(idsAt(base)).toContain('scan')
    expect(idsAt(`${base}/scan`)).not.toContain('scan')
  })
})
