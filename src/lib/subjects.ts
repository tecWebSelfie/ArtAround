import 'server-only'

import { normalizeLocale } from '@/lib/localized'
import { getSession } from '@/lib/session'
import type { Subject } from '@/payload-types'
import { asId } from '@/access/museumRoles'

/**
 * The subjects (author, movement, events) linked to a work, in the visitor's
 * language, for the object details and the voice commands "who's the
 * author?" and "what style is it?". Subjects are public: read without access
 * checks. Names Wikidata didn't have in that language fall back to English.
 */
export type WorkSubjects = Awaited<ReturnType<typeof subjectsOfWork>>

export async function subjectsOfWork(
  work: { creators?: unknown[] | null; movements?: unknown[] | null; events?: unknown[] | null },
  lng: string,
) {
  const ids = (list: unknown[] | null | undefined) =>
    (list ?? []).map(asId).filter((id): id is string => Boolean(id))
  const all = [...ids(work.creators), ...ids(work.movements), ...ids(work.events)]
  if (!all.length) return { creators: [], movements: [], events: [] }
  const { payload } = await getSession()
  const { docs } = await payload.find({
    collection: 'subjects',
    where: { id: { in: all } },
    locale: normalizeLocale(lng) ?? 'en',
    depth: 0,
    pagination: false,
    select: { name: true, kind: true },
  })
  const byId = new Map(
    docs.map((doc) => [String(doc.id), doc as Pick<Subject, 'id' | 'name' | 'kind'>]),
  )
  const pick = (list: unknown[] | null | undefined) => ids(list).flatMap((id) => byId.get(id) ?? [])
  return {
    creators: pick(work.creators),
    movements: pick(work.movements),
    events: pick(work.events),
  }
}
