// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { usePhotonAutocomplete } from '@asammad48/react-map-place'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import {
  formatMuseumAddress,
  isMuseumPoint,
  museumLocationFromPlace,
  museumPointFromFields,
} from '@/lib/museum-location'
import { MUSEUM_PHOTON_RESPONSE, MUSEUM_FULL_ADDRESS } from '@/mocks/museum-location.mock'

// Exercise the installed, patched hook against MSW rather than recreating its data/state logic.
const endpoint = 'https://photon.fixture.test'
const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
const response = (name = 'Museum fixture') => ({
  ...MUSEUM_PHOTON_RESPONSE,
  features: [
    {
      ...MUSEUM_PHOTON_RESPONSE.features[0],
      properties: { ...MUSEUM_PHOTON_RESPONSE.features[0].properties, name },
    },
  ],
})
const options = { endpoint, debounceMs: 5, requestTimeoutMs: 1000 }

async function search(
  hook: { result: { current: ReturnType<typeof usePhotonAutocomplete> } },
  query: string,
) {
  act(() => hook.result.current.setQuery(query))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
}

describe('museum geographic data', () => {
  it('adds missing cities to legacy addresses without repeating formatted address cities', () => {
    expect(formatMuseumAddress({ address: 'Via Brera 28', city: 'Milano' })).toBe(
      'Via Brera 28, Milano',
    )
    expect(
      formatMuseumAddress({ address: MUSEUM_FULL_ADDRESS, city: 'Milano', postalCode: '20121' }),
    ).toBe(MUSEUM_FULL_ADDRESS)
    expect(formatMuseumAddress({ address: 'Via Milano 1', city: 'Milano' })).toBe(
      'Via Milano 1, Milano',
    )
    expect(
      formatMuseumAddress({
        address: 'Via Brera 28, 20121 Milano',
        city: 'Milano',
        postalCode: '20121',
      }),
    ).toBe('Via Brera 28, 20121 Milano')
    expect(formatMuseumAddress({ address: '', city: 'Milano' })).toBe('')
  })

  it('validates longitude-first points and rejects empty or invalid manual fields', () => {
    expect(museumPointFromFields('9.19', '45.4642')).toEqual([9.19, 45.4642])
    expect(museumPointFromFields('0', '0')).toEqual([0, 0])
    for (const point of [[181, 0], [0, 91], [NaN, 0], [0, Infinity], ['9', 45], [9]])
      expect(isMuseumPoint(point)).toBe(false)
    expect(museumPointFromFields('', '45')).toBeNull()
    expect(museumPointFromFields('9', ' ')).toBeNull()
    expect(museumPointFromFields('abc', '45')).toBeNull()
  })
})

describe('Map Place autocomplete integration', () => {
  it('returns normalized postal data and a GeoJSON-order point', async () => {
    server.use(http.get(`${endpoint}/api`, () => HttpResponse.json(response())))
    const hook = renderHook(() => usePhotonAutocomplete(options))
    await search(hook, 'Brera')
    const location = museumLocationFromPlace(hook.result.current.results[0])
    expect(location).toEqual({
      address: MUSEUM_FULL_ADDRESS,
      city: 'Milano',
      region: 'Lombardia',
      postalCode: '20121',
      country: 'IT',
      latlng: [9.1881, 45.4719],
    })
  })

  it('keeps a settled result when the same query is assigned again', async () => {
    server.use(http.get(`${endpoint}/api`, () => HttpResponse.json(response())))
    const hook = renderHook(() => usePhotonAutocomplete(options))
    await search(hook, 'Brera')
    act(() => hook.result.current.setQuery('Brera'))
    expect(hook.result.current.loading).toBe(false)
    expect(hook.result.current.results).toHaveLength(1)
  })

  it('invalidates an old request immediately while new text is still debouncing', async () => {
    server.use(
      http.get(`${endpoint}/api`, async () => {
        await delay(80)
        return HttpResponse.json(response('Old museum'))
      }),
    )
    const hook = renderHook(() => usePhotonAutocomplete(options))
    act(() => hook.result.current.setQuery('Old'))
    await new Promise((resolve) => setTimeout(resolve, 15))
    act(() => hook.result.current.setQuery(''))
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(hook.result.current.results).toEqual([])
    expect(hook.result.current.loading).toBe(false)
    expect(hook.result.current.error).toBeNull()
  })

  it('keeps the newest query when responses arrive in reverse order', async () => {
    server.use(
      http.get(`${endpoint}/api`, async ({ request }) => {
        const text = new URL(request.url).searchParams.get('q')!
        await delay(text === 'Old' ? 100 : 5)
        return HttpResponse.json(response(text))
      }),
    )
    const hook = renderHook(() => usePhotonAutocomplete(options))
    act(() => hook.result.current.setQuery('Old'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await search(hook, 'Newest')
    await new Promise((resolve) => setTimeout(resolve, 110))
    expect(hook.result.current.results.map((place) => place.name)).toEqual(['Newest'])
  })

  it('uses cached results but partitions cache and requests by all geographic options', async () => {
    const requests: URL[] = []
    server.use(
      http.get(`${endpoint}/api`, ({ request }) => {
        requests.push(new URL(request.url))
        return HttpResponse.json(response())
      }),
    )
    const hook = renderHook(
      ({ longitude, raw }) =>
        usePhotonAutocomplete({
          ...options,
          countryCodes: ['IT'],
          locationBias: { longitude, latitude: 45 },
          includeRawProviderData: raw,
        }),
      { initialProps: { longitude: 9, raw: false } },
    )
    await search(hook, 'Brera')
    await search(hook, 'Milano')
    await search(hook, 'Brera')
    expect(requests).toHaveLength(2)
    expect(requests[0].searchParams.get('countrycode')).toBe('IT')
    expect(requests[0].searchParams.has('countrycodes')).toBe(false)
    hook.rerender({ longitude: 10, raw: true })
    await waitFor(() => expect(requests).toHaveLength(3))
    await waitFor(() => expect(hook.result.current.results[0]?.raw).toBeDefined())
    expect(requests[2].searchParams.get('lon')).toBe('10')
  })

  it('reports a timeout as a recoverable error rather than silently empty results', async () => {
    server.use(
      http.get(`${endpoint}/api`, async () => {
        await delay(200)
        return HttpResponse.json(response())
      }),
    )
    const hook = renderHook(() => usePhotonAutocomplete({ ...options, requestTimeoutMs: 15 }))
    await search(hook, 'Brera')
    expect(hook.result.current.error?.code).toBe('REQUEST_TIMEOUT')
    expect(hook.result.current.results).toEqual([])
  })

  it('reports an unavailable provider and recovers on the next search', async () => {
    server.use(http.get(`${endpoint}/api`, () => new HttpResponse(null, { status: 503 })))
    const hook = renderHook(() => usePhotonAutocomplete(options))
    await search(hook, 'Brera')
    expect(hook.result.current.error?.code).toBe('SEARCH_FAILED')
    server.use(http.get(`${endpoint}/api`, () => HttpResponse.json(response())))
    await search(hook, 'Milano')
    expect(hook.result.current.error).toBeNull()
    expect(hook.result.current.results).toHaveLength(1)
  })
})
