/**
 * "Who asked what" in a group visit (requirement 9 of
 * `docs/plan/requisiti-18-33.md`): guests can't move the group, but they can
 * ask for more about a work or for a different wording; the host (the
 * teacher) sees, at any moment, which guest asked what at which stop.
 *
 * A guest's requests travel as one LiveKit participant attribute,
 * `requests`, like the quiz progress (`src/lib/group.ts`): attributes reach
 * people who reconnect too, so a host who reloads still sees everything.
 * They are read from the guest's own URL state — the reading options and
 * "Tell me more" are URL parameters of the content modal — so nothing in the
 * reading components has to know about groups.
 */

/** What a guest can ask for, as recorded. */
export type GroupRequestKind =
  | 'more'
  | 'curiosities'
  | 'story'
  /** A version in another wording level (the content's own level isn't known here). */
  | 'level:easy'
  | 'level:medium'
  | 'level:hard'
  | 'shorter'
  | 'children'

/** One request: what, at which tour stop (0-based), when (ms). */
export type GroupRequest = { kind: GroupRequestKind; stop: number; at: number }

/** Attribute name on the guest's participant. */
export const REQUESTS_ATTRIBUTE = 'requests'
/** Attributes share 64 KiB per participant: a visit's worth of requests is plenty. */
const MAX_REQUESTS = 60

const ANGLES = new Set(['more', 'curiosities', 'story'])

const LEVELS = new Set(['easy', 'medium', 'hard'])

/** The requests a guest's current URL expresses. */
export function requestsInUrl(search: URLSearchParams): GroupRequestKind[] {
  const kinds: GroupRequestKind[] = []
  const more = search.get('more')
  if (more && ANGLES.has(more)) kinds.push(more as GroupRequestKind)
  const level = search.get('level')
  if (level && LEVELS.has(level)) kinds.push(`level:${level}` as GroupRequestKind)
  if (search.get('seconds')) kinds.push('shorter')
  if (search.get('audience') === 'children') kinds.push('children')
  return kinds
}

/** The tour stop (0-based) of a group location, or null outside a stop. */
export function stopOfLocation(location: string): number | null {
  const step = /\/tour\/[^/?]+\/(\d+)/.exec(location)?.[1]
  return step === undefined ? null : Number(step)
}

/** Parses the attribute; anything malformed reads as no requests. */
export function parseRequests(value: string | undefined): GroupRequest[] {
  if (!value) return []
  try {
    const list = JSON.parse(value) as unknown
    return Array.isArray(list)
      ? list.filter(
          (item): item is GroupRequest =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.kind === 'string' &&
            typeof item.stop === 'number' &&
            typeof item.at === 'number',
        )
      : []
  } catch {
    return []
  }
}

/**
 * Adds what is new: the same request at the same stop counts once, however
 * often the guest reopens it. Returns null when nothing changed, so callers
 * don't publish the same attribute again.
 */
export function addRequests(
  list: GroupRequest[],
  kinds: GroupRequestKind[],
  stop: number,
  now: number,
): GroupRequest[] | null {
  const fresh = kinds.filter((kind) => !list.some((r) => r.kind === kind && r.stop === stop))
  if (!fresh.length) return null
  return [...list, ...fresh.map((kind) => ({ kind, stop, at: now }))].slice(-MAX_REQUESTS)
}
