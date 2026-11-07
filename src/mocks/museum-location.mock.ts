import { http, HttpResponse } from 'msw'

export const MUSEUM_FULL_ADDRESS = '28, Via Brera, Milano, 20121, Italia'

/** Synthetic provider data keeps address/map stories deterministic without calling public services. */
export const MUSEUM_PHOTON_RESPONSE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [9.1881, 45.4719] },
      properties: {
        osm_type: 'N',
        osm_id: 42,
        name: 'Pinacoteca fixture',
        street: 'Via Brera',
        housenumber: '28',
        city: 'Milano',
        state: 'Lombardia',
        postcode: '20121',
        country: 'Italia',
        countrycode: 'IT',
      },
    },
  ],
}

// Empty background style exercises real WebGL and marker lifecycle without fetching external tiles.
export const museumBasemapHandler = http.get(
  'https://basemaps.cartocdn.com/gl/:style/style.json',
  ({ params }) =>
    HttpResponse.json({
      version: 8,
      sources: {},
      layers: [
        {
          id: 'fixture-background',
          type: 'background',
          paint: {
            'background-color': params.style === 'dark-matter-gl-style' ? '#25262b' : '#e9ecef',
          },
        },
      ],
    }),
)
export const museumAddressHandler = http.get('https://photon.komoot.io/api', () =>
  HttpResponse.json(MUSEUM_PHOTON_RESPONSE),
)
