import type { Content, Object as MuseumObject, Tour } from '@/payload-types'
import { ItemNode } from '@pascal-app/core'
import type { Route } from 'next'

/** URL and Payload/Pascal adapters shared across the tour navigation route tree. */
export type NavigationCatalogObject = Pick<MuseumObject, 'id' | 'name'> & {
  contents: Pick<Content, 'id' | 'title'>[]
}

/** The cursor counts completed contents; count itself represents a finished tour. */
export function tourStepIndex(value: string, count: number): number | null {
  if (!/^\d+$/.test(value)) return null
  const step = Number(value)
  return Number.isSafeInteger(step) && step <= count ? step : null
}

export function tourNavigationPath(lng: string, tourId: string, step: number) {
  return `/${lng}/tour/${tourId}/navigation/${step}` as Route
}

/** Carry shareable navigation state between canonical and contextual routes. */
export function withNavigationPosition(
  path: string,
  search: string | { at?: string | string[]; to?: string | string[]; mobility?: string | string[] },
) {
  const input = typeof search === 'string' ? new URLSearchParams(search) : search
  const output = new URLSearchParams()
  for (const key of ['at', 'to'] as const) {
    const value = input instanceof URLSearchParams ? input.get(key) : input[key]
    if (typeof value === 'string' && value) output.set(key, value)
  }
  const mobility = input instanceof URLSearchParams ? input.get('mobility') : input.mobility
  if (mobility === 'wheelchair') output.set('mobility', mobility)
  return `${path}${output.size ? `?${output}` : ''}` as Route
}

/** Change one shareable position field while preserving the other URL state. */
export function withNavigationValue(
  path: string,
  search: string,
  key: 'at' | 'to' | 'mobility',
  value: string | null,
) {
  const params = new URLSearchParams(search)
  if (value) params.set(key, value)
  else params.delete(key)
  return withNavigationPosition(path, params.toString())
}

/** Shared by content links and intercepted canonical content routes. */
export function tourContentPath(
  lng: string,
  tour: Pick<Tour, 'id' | 'contents'>,
  step: number,
  contentId: string,
) {
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  return nextId === contentId
    ? (`${tourNavigationPath(lng, tour.id, step)}/open` as const)
    : (`${tourNavigationPath(lng, tour.id, step)}/content/${contentId}` as const)
}

/** Catalog placement preserves the Payload object ID in the asset. */
export function museumObjectId(node: unknown): string | null {
  const result = ItemNode.safeParse(node)
  return result.success && result.data.asset.category === 'museum-objects'
    ? result.data.asset.id
    : null
}

export function contentObjectId(content: Content): string | null {
  const object = content.objects?.docs?.[0]
  return typeof object === 'string' ? object : (object?.id ?? null)
}
