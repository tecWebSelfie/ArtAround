// @vitest-environment jsdom
// VisitPlaceSearch: the typed place is geocoded (MSW stands in for Photon),
// the app's museums come back as radio cards ordered by distance, a chosen
// museum stays remembered until changed, and the location button uses the
// browser's geolocation.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import '@/mocks/i18n'
import { VisitPlaceSearch } from '../../src/app/[lng]/(frontend)/tour/plan/VisitPlaceSearch'
import type { Museum } from '../../src/app/[lng]/(frontend)/tour/plan/plan-visit-state'

const endpoint = 'https://photon.fixture.test'
const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.unstubAllEnvs()
})
afterAll(() => server.close())

/** One Photon feature at the given [lng, lat], in the shape the hook reads. */
const photon = (lng: number, lat: number) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        osm_type: 'N',
        osm_id: 42,
        name: 'Bologna',
        street: 'Via Indipendenza',
        housenumber: '1',
        city: 'Bologna',
        country: 'Italia',
        countrycode: 'IT',
      },
    },
  ],
})

const museums: Museum[] = [
  { value: 'far', name: 'Museo Lontano', label: 'Museo Lontano, Ferrara', latlng: [11, 44] },
  { value: 'near', name: 'Museo Vicino', label: 'Museo Vicino, Bologna', latlng: [9.01, 45.01] },
  { value: 'mid', name: 'Museo Medio', label: 'Museo Medio, Bologna', latlng: [9.1, 45.1] },
  { value: 'nowhere', name: 'Museo senza luogo', label: 'Museo senza luogo', latlng: null },
]

function renderSearch({
  value = null,
  onChange = vi.fn(),
}: { value?: string | null; onChange?: (museumId: string | null) => void } = {}) {
  vi.stubEnv('NEXT_PUBLIC_PHOTON_ENDPOINT', endpoint)
  server.use(http.get(`${endpoint}/api`, () => HttpResponse.json(photon(9, 45))))
  render(
    <VisitPlaceSearch
      museums={museums}
      value={value}
      onChange={onChange}
      labelledBy="plan-where"
    />,
  )
  return { onChange }
}

describe('VisitPlaceSearch', () => {
  it('starts at rest with the hint, and offers nothing until a place is known', () => {
    renderSearch()
    expect(
      screen.getByText('Type the place you are at - the nearest museums come first.'),
    ).toBeTruthy()
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('geocodes the typed place and orders museums by distance, nearest first', async () => {
    const { onChange } = renderSearch()
    const input = screen.getByPlaceholderText('e.g. Bologna, via Indipendenza')
    fireEvent.change(input, { target: { value: 'Bologna, via Indipendenza' } })
    await waitFor(() => expect(screen.getByRole('radiogroup')).toBeTruthy(), { timeout: 5000 })
    const cards = screen.getAllByRole('radio')
    // 'Museo senza luogo' has no coordinates and cannot be ranked.
    expect(cards.map((card) => (card as HTMLInputElement).value)).toEqual(['near', 'mid', 'far'])
    expect(screen.getByText('Nearest')).toBeTruthy()
    // First card carries the NEAREST badge; every card a distance chip.
    expect(
      cards.map(
        (card) => card.closest('label')?.querySelector('.plan-visit-sugg-distance')?.textContent,
      ),
    ).toEqual(['1.4 km', '13.6 km', '193.7 km'])
    fireEvent.click(cards[0])
    expect(onChange).toHaveBeenCalledWith('near')
  })

  it('keeps a chosen museum remembered until the visitor changes it', () => {
    const { onChange } = renderSearch({ value: 'near' })
    expect(screen.getByText('Museo Vicino')).toBeTruthy()
    expect(screen.queryByRole('radiogroup')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('uses the browser location when the visitor shares it', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { longitude: 9, latitude: 45 } } as GeolocationPosition),
    )
    Object.defineProperty(window.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })
    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))
    await waitFor(() => expect(screen.getByRole('radiogroup')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getAllByRole('radio').map((card) => (card as HTMLInputElement).value)).toEqual([
      'near',
      'mid',
      'far',
    ])
    expect(screen.getByPlaceholderText('e.g. Bologna, via Indipendenza')).toHaveProperty(
      'value',
      'Your location',
    )
  })

  it('returns to typed-place ranking after using shared location', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { longitude: 11, latitude: 44 } } as GeolocationPosition),
    )
    Object.defineProperty(window.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })
    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))
    await waitFor(() => expect(screen.getAllByRole('radio')[0]).toHaveProperty('value', 'far'))
    fireEvent.change(screen.getByPlaceholderText('e.g. Bologna, via Indipendenza'), {
      target: { value: 'Bologna, via Indipendenza' },
    })
    await waitFor(() => expect(screen.getAllByRole('radio')[0]).toHaveProperty('value', 'near'), {
      timeout: 5000,
    })
  })

  it('reports a place-search outage instead of pretending there are no museums', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTON_ENDPOINT', endpoint)
    server.use(http.get(`${endpoint}/api`, () => new HttpResponse(null, { status: 500 })))
    render(
      <VisitPlaceSearch
        museums={museums}
        value={null}
        onChange={vi.fn()}
        labelledBy="plan-where"
      />,
    )
    const input = screen.getByPlaceholderText('e.g. Bologna, via Indipendenza')
    fireEvent.change(input, { target: { value: 'Bologna, via Indipendenza' } })
    await waitFor(
      () =>
        expect(
          screen.getByText('Place search is unavailable. Check the text or try again.'),
        ).toBeTruthy(),
      { timeout: 5000 },
    )
  })
})
