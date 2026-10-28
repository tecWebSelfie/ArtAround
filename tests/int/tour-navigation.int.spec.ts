import { describe, expect, it } from 'vitest'
import { parseAppUrl } from '@/lib/app-url'
import {
  museumNavigationPath,
  navigationBasePath,
  navigationContentPath,
  parseNavigationPathname,
  tourMuseumId,
  tourNavigationPath,
  tourStartPath,
  tourContentPath,
  tourQuizPath,
  tourQuizResultPath,
  tourStepIndex,
  museumObjectId,
  nextVisitableStep,
  tourAdvanceHref,
  unavailableStops,
  withNavigationPosition,
  withNavigationValue,
} from '@/lib/tour-navigation'
import { ItemNode } from '@pascal-app/core'

describe('tour navigation', () => {
  it('keeps confirmed position and destination in shareable URLs without unrelated query data', () => {
    expect(
      withNavigationPosition('/it/museum/m/navigation/tour/t/2/open', 'at=a&to=b&unrelated=secret'),
    ).toBe('/it/museum/m/navigation/tour/t/2/open?at=a&to=b')
    expect(
      withNavigationPosition('/it/museum/m/navigation/tour/t/2', { at: 'a', to: ['b', 'c'] }),
    ).toBe('/it/museum/m/navigation/tour/t/2?at=a')
  })
  it('preserves the wheelchair profile across navigation links and position changes', () => {
    expect(withNavigationPosition('/it/object/a', 'at=a&mobility=wheelchair&unrelated=x')).toBe(
      '/it/object/a?at=a&mobility=wheelchair',
    )
    expect(
      withNavigationValue(
        '/it/museum/m/navigation/tour/t/2',
        'at=a&mobility=wheelchair',
        'to',
        'b',
      ),
    ).toBe('/it/museum/m/navigation/tour/t/2?at=a&to=b&mobility=wheelchair')
    expect(withNavigationPosition('/it/object/a', 'mobility=walking')).toBe('/it/object/a')
  })
  it('accepts canonical QR paths and same-origin URLs, but not external destinations', () => {
    const origin = 'https://artaround.example'
    expect(parseAppUrl('/it/object/abc', origin)?.pathname).toBe('/it/object/abc')
    expect(parseAppUrl(`${origin}/it/content/abc`, origin)?.pathname).toBe('/it/content/abc')
    for (const value of [
      'https://elsewhere.example/it/object/abc',
      '//elsewhere.example/x',
      'javascript:alert(1)',
      'not a path',
      undefined,
    ]) {
      expect(parseAppUrl(value, origin)).toBeNull()
    }
  })

  it('opens only the expected content as the next step, preserving the original order', () => {
    const tour = { id: 'tour', museum: 'm', contents: ['first', 'second', 'third'] }
    expect(tourContentPath('it', tour, 1, 'second')).toBe(
      '/it/museum/m/navigation/tour/tour/1/open',
    )
    expect(tourContentPath('it', tour, 1, 'first')).toBe(
      '/it/museum/m/navigation/tour/tour/1/content/first',
    )
    expect(tourContentPath('it', tour, 1, 'third')).toBe(
      '/it/museum/m/navigation/tour/tour/1/content/third',
    )
    expect(tourContentPath('it', tour, 3, 'second')).toBe(
      '/it/museum/m/navigation/tour/tour/3/content/second',
    )
  })

  it('accepts the completion cursor and rejects malformed or out-of-range steps', () => {
    expect(tourStepIndex('0', 3)).toBe(0)
    expect(tourStepIndex('3', 3)).toBe(3)
    for (const value of ['-1', '4', '1x', '1.5', '', '9007199254740992']) {
      expect(tourStepIndex(value, 3)).toBeNull()
    }
  })

  it('identifies placed museum objects by asset ID, independently of model URL', () => {
    const asset = {
      id: 'object-id',
      category: 'museum-objects',
      name: 'Vase',
      thumbnail: '',
      src: 'https://cdn.example/vase.glb',
    }
    expect(museumObjectId(ItemNode.parse({ asset }))).toBe('object-id')
    expect(
      museumObjectId(
        ItemNode.parse({ asset: { ...asset, src: 'https://another.example/new.glb' } }),
      ),
    ).toBe('object-id')
    expect(
      museumObjectId(ItemNode.parse({ asset: { ...asset, category: 'furniture' } })),
    ).toBeNull()
  })

  it('derives map and content URLs for a tour and for free navigation of a museum', () => {
    const tour = { id: 't', museum: 'm', contents: ['c1', 'c2'] }
    const inTour = { kind: 'tour' as const, tour, step: 1 }
    const free = { kind: 'free' as const, museumId: 'm' }
    expect(museumNavigationPath('it', 'm')).toBe('/it/museum/m/navigation')
    expect(navigationBasePath('it', inTour)).toBe('/it/museum/m/navigation/tour/t/1')
    expect(navigationBasePath('it', free)).toBe('/it/museum/m/navigation')
    // In a tour the next stop opens `/open`; free navigation has no next stop.
    expect(navigationContentPath('it', inTour, 'c2')).toBe('/it/museum/m/navigation/tour/t/1/open')
    expect(navigationContentPath('it', inTour, 'c1')).toBe(
      '/it/museum/m/navigation/tour/t/1/content/c1',
    )
    expect(navigationContentPath('it', free, 'c2')).toBe('/it/museum/m/navigation/content/c2')
  })
  it('nests tour URLs in their museum navigation and reads them back', () => {
    expect(tourStartPath('it', 'm', 't')).toBe('/it/museum/m/navigation/tour/t')
    expect(tourNavigationPath('it', 'm', 't', 2)).toBe('/it/museum/m/navigation/tour/t/2')
    expect(tourMuseumId({ museum: 'm' })).toBe('m')
    expect(tourMuseumId({ museum: { id: 'm' } as never })).toBe('m')
    // The Next-Url pathname an interceptor sees: free map, tour step, modal, start page.
    expect(parseNavigationPathname('/it/museum/m/navigation')).toEqual({
      lng: 'it',
      museumId: 'm',
      tourId: null,
      step: null,
    })
    expect(parseNavigationPathname('/it/museum/m/navigation/content/c')).toMatchObject({
      tourId: null,
    })
    expect(parseNavigationPathname('/it/museum/m/navigation/tour/t/2/open')).toEqual({
      lng: 'it',
      museumId: 'm',
      tourId: 't',
      step: '2',
    })
    expect(parseNavigationPathname('/it/museum/m/navigation/tour/t')).toMatchObject({
      tourId: 't',
      step: null,
    })
    expect(parseNavigationPathname('/it/museum/m')).toBeNull()
    expect(parseNavigationPathname('/it/tour/t/navigation/2')).toBeNull()
  })
  it('opens the quiz with the left cursor, keeping position and dropping the destination', () => {
    expect(tourQuizPath('it', 't', 3, 'at=a&to=b&mobility=wheelchair&q=2')).toBe(
      '/it/tour/t/quiz?at=a&mobility=wheelchair&from=3',
    )
    expect(tourQuizPath('it', 't', 0, '')).toBe('/it/tour/t/quiz?from=0')
    expect(tourQuizResultPath('it', 't', 'a/b')).toBe('/it/tour/t/quiz/result/a%2Fb')
  })

  it('flags stops whose content is gone or whose object is not on the map, and skips them', () => {
    const content = (id: string, objectId?: string) =>
      ({ id, title: id, objects: { docs: objectId ? [objectId] : [] } }) as never
    const catalog = [{ id: 'listed', name: 'Listed', contents: [{ id: 'c-listed', title: 'x' }] }]
    const contents = [
      content('c-placed', 'placed'),
      content('c-unplaced', 'unplaced'),
      'c-deleted',
      content('c-no-object'),
      // The catalog's authored relation wins over the content's own objects.
      content('c-listed', 'unplaced'),
    ] as never
    const skipped = unavailableStops(contents, catalog, new Set(['placed', 'listed']))
    expect([...skipped]).toEqual([1, 2, 3])
    expect(nextVisitableStep(0, 5, skipped)).toBe(0)
    expect(nextVisitableStep(1, 5, skipped)).toBe(4)
    // Only unavailable stops left: the tour is complete.
    expect(nextVisitableStep(1, 4, skipped)).toBe(4)
  })

  it('advances to the next map step, or to the quiz when that ends the tour', () => {
    const tour = { id: 't', museum: 'm', contents: ['a', 'b'], quiz: { questions: ['q'] } }
    expect(tourAdvanceHref('en', tour, 1, 'at=o1&to=o2')).toEqual({
      href: '/en/museum/m/navigation/tour/t/1?at=o1',
      quiz: false,
    })
    expect(tourAdvanceHref('en', tour, 2, 'at=o1&to=o2')).toEqual({
      href: '/en/tour/t/quiz?at=o1&from=2',
      quiz: true,
    })
    expect(tourAdvanceHref('en', { ...tour, quiz: {} }, 2, '').href).toBe(
      '/en/museum/m/navigation/tour/t/2',
    )
  })
})
