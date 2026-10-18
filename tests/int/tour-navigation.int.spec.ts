import { describe, expect, it } from 'vitest'
import { parseAppUrl } from '@/lib/app-url'
import {
  tourContentPath,
  tourStepIndex,
  museumObjectId,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { ItemNode } from '@pascal-app/core'

describe('tour navigation', () => {
  it('keeps confirmed position and destination in shareable URLs without unrelated query data', () => {
    expect(
      withNavigationPosition('/it/tour/t/navigation/2/open', 'at=a&to=b&unrelated=secret'),
    ).toBe('/it/tour/t/navigation/2/open?at=a&to=b')
    expect(withNavigationPosition('/it/tour/t/navigation/2', { at: 'a', to: ['b', 'c'] })).toBe(
      '/it/tour/t/navigation/2?at=a',
    )
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
    const tour = { id: 'tour', contents: ['first', 'second', 'third'] }
    expect(tourContentPath('it', tour, 1, 'second')).toBe('/it/tour/tour/navigation/1/open')
    expect(tourContentPath('it', tour, 1, 'first')).toBe('/it/tour/tour/navigation/1/content/first')
    expect(tourContentPath('it', tour, 1, 'third')).toBe('/it/tour/tour/navigation/1/content/third')
    expect(tourContentPath('it', tour, 3, 'second')).toBe(
      '/it/tour/tour/navigation/3/content/second',
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
})
