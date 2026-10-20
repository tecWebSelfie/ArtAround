/**
 * Group tours: shared rules used by the browser (GroupProvider) and the
 * server (`/api/rooms`). A group is one LiveKit room whose name is the
 * 6-character code people type or scan. Nothing about the room is stored in
 * Payload: the host's device keeps a secret host key, every device keeps its
 * own membership in localStorage, and live state travels as LiveKit
 * participant attributes:
 *
 *   host  → `path`  where the group is (tour step, open modal, quiz)
 *         → `quiz`  'ended' once the host closes the group quiz
 *   guest → `quizAnswered` / `quizTotal` / `quizToken` (progress, then result)
 *
 * Attributes are delivered to people who join late too, so a latecomer
 * lands where the group is without extra messages.
 */

import { z } from 'zod'

/** No 0/O or 1/I: codes are read aloud and typed from a screen. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6
export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/

/** The name a visitor shows to the group; the forms and `/api/rooms` validate with the same schema. */
export const GroupName = z.string().trim().min(1).max(30)
export const GroupNameForm = z.object({ name: GroupName })

/** The host always joins with this identity, so guests can't pose as the host. */
export const HOST_IDENTITY = 'host'

/** Codes are typed in any case and with stray spaces. */
export function normalizeRoomCode(input: string) {
  return input.replace(/[\s-]/g, '').toUpperCase()
}

export const roomPath = (lng: string, code: string) => `/${lng}/room/${code}`

/**
 * The invite link and QR: language-free, so each guest joins (and then follows
 * the host) in their own language; the i18n proxy picks it on arrival.
 */
export const roomSharePath = (code: string) => `/room/${code}`

/**
 * URL params the whole group shares: where everyone is and where they are going.
 * Everything else (wheelchair routing, reading options, "Tell me more", quiz
 * question) stays personal.
 */
const SHARED_PARAMS = ['at', 'to', 'service', 'exit'] as const
/** Personal params that stay valid on any page of the tour. */
const PERSONAL_PARAMS = ['mobility', 'audience'] as const
/** Personal reading choices of the open modal; dropped when the modal changes. */
const MODAL_PARAMS = ['level', 'minutes', 'more'] as const

/** Strips the `/{lng}` prefix: guests may read the tour in another language. */
function withoutLanguage(pathname: string) {
  return pathname.replace(/^\/[^/]+/, '')
}

/**
 * The part of a URL the group shares, e.g. `/tour/42/navigation/3/content/7?at=9`.
 * The host publishes it; a guest compares it with its own to know whether to follow.
 */
export function groupLocation(pathname: string, search: URLSearchParams) {
  const shared = new URLSearchParams()
  for (const key of SHARED_PARAMS) {
    const value = search.get(key)
    if (value) shared.set(key, value)
  }
  const path = withoutLanguage(pathname)
  return shared.size ? `${path}?${shared}` : path
}

/** True while the host's location is the group quiz (guests then move freely inside it). */
export function isQuizLocation(location: string, tourId: string) {
  return location.startsWith(`/tour/${tourId}/quiz`)
}

/**
 * Where a guest goes to follow the host: the host's location in the guest's
 * own language, plus the guest's personal params (reading choices only when
 * still on the same page).
 */
export function followHref(
  hostLocation: string,
  lng: string,
  pathname: string,
  search: URLSearchParams,
) {
  const [hostPath, hostQuery = ''] = hostLocation.split('?')
  const params = new URLSearchParams(hostQuery)
  const samePage = withoutLanguage(pathname) === hostPath
  for (const key of [...PERSONAL_PARAMS, ...(samePage ? MODAL_PARAMS : [])]) {
    const value = search.get(key)
    if (value) params.set(key, value)
  }
  return `/${lng}${hostPath}${params.size ? `?${params}` : ''}`
}
