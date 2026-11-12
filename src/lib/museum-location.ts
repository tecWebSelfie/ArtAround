import type { MapPlace } from '@asammad48/react-map-place'
import { EARTH_RADIUS_METRES } from '@/lib/gps'
import type { Museum } from '@/payload-types'

/** Geographic coordinates use Payload/GeoJSON longitude-first order, never Pascal's local metres. */
export type MuseumPoint = [number, number]

/**
 * Great-circle (haversine) distance in kilometres from a position to a
 * museum, for the "Museums near you" rail. `gpsOffsetMetres` (src/lib/gps.ts)
 * is the flat approximation for metres inside a building; this one spans cities.
 */
export function distanceKm(
  from: { latitude: number; longitude: number },
  [longitude, latitude]: MuseumPoint,
) {
  const rad = Math.PI / 180
  const dLat = (latitude - from.latitude) * rad
  const dLng = (longitude - from.longitude) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.latitude * rad) * Math.cos(latitude * rad) * Math.sin(dLng / 2) ** 2
  return (2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(a))) / 1000
}

/** Preserve legacy street-only records while avoiding a second city in provider-formatted addresses. */
export function formatMuseumAddress({
  address,
  city,
  postalCode,
}: Pick<Museum['location'], 'address' | 'city' | 'postalCode'>): string {
  const text = address.trim()
  const locality = city.trim()
  if (!text || !locality) return text
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  const parts = text.split(',').map(normalize)
  const variants = [
    locality,
    [postalCode, locality].filter(Boolean).join(' '),
    [locality, postalCode].filter(Boolean).join(' '),
  ]
  return variants.some((value) => parts.includes(normalize(value))) ? text : `${text}, ${locality}`
}

export function isMuseumPoint(value: unknown): value is MuseumPoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    Math.abs(value[0]) <= 180 &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]) &&
    Math.abs(value[1]) <= 90
  )
}

/** Empty manual fields must not silently become the geographic origin through Number(''). */
export function museumPointFromFields(longitude: string, latitude: string): MuseumPoint | null {
  if (!longitude.trim() || !latitude.trim()) return null
  const point = [Number(longitude), Number(latitude)]
  return isMuseumPoint(point) ? point : null
}

/** A newly selected address replaces obsolete postal fields as well as the point. */
export function museumLocationFromPlace(place: MapPlace): Museum['location'] | null {
  const latlng = [place.longitude, place.latitude]
  if (!isMuseumPoint(latlng)) return null
  return {
    // Keep the complete provider label; the normal editing flow has no separate city input.
    address: place.formattedAddress,
    city: place.city ?? '',
    region: place.state ?? null,
    postalCode: place.postcode ?? null,
    country: place.countryCode?.toUpperCase() ?? null,
    latlng,
  }
}
