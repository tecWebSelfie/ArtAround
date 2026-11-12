'use client'

import { TourRail } from '@/components/mantine/DiscoverRail'
import type { RotatingCandidate } from '@/lib/discover'
import { createSessionStore } from '@/lib/session-store'
import { Skeleton, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * The navigator home's second rail: one collection per visit, drawn from the
 * candidates the server built (`rotatingCandidates`). Its title names the
 * criterion ("Quick visits", "Step-free tours"…), so over a few visits the
 * rotation itself shows what the app holds. Rules from the surface brief:
 *
 * - stable within a visit: the pick is kept in sessionStorage, so going back
 *   to the home doesn't reshuffle it under the visitor's finger;
 * - never the same collection two visits in a row: the last pick is kept in
 *   localStorage and skipped when another candidate exists.
 *
 * The pick happens in the browser (the server can't write cookies while it
 * renders), so the server render and hydration show a placeholder of the
 * rail's size, below the first screen.
 */

const CURRENT_KEY = 'aa-discover-rail'
const LAST_KEY = 'aa-discover-last'

const store = createSessionStore<string | null>((stored) =>
  typeof stored === 'string' ? stored : null,
)

/** A new pick, avoiding the previous visit's collection when there is another. */
function drawRail(ids: string[]) {
  let last: string | null = null
  try {
    last = window.localStorage.getItem(LAST_KEY)
  } catch {}
  const fresh = ids.length > 1 ? ids.filter((id) => id !== last) : ids
  const pick = fresh[Math.floor(Math.random() * fresh.length)]
  try {
    window.localStorage.setItem(LAST_KEY, pick)
  } catch {}
  return pick
}

export function RotatingRail({ candidates }: { candidates: RotatingCandidate[] }) {
  const { lng } = useParams<{ lng: string }>()
  const current = store.useValue(CURRENT_KEY)
  const rail = candidates.find((candidate) => candidate.id === current)
  const ids = candidates.map((candidate) => candidate.id).join(' ')

  // No kept pick for these candidates yet (first home of the visit, or the
  // kept one is no longer offered): draw one. Saving notifies the store.
  useEffect(() => {
    const offered = ids ? ids.split(' ') : []
    const kept = store.get(CURRENT_KEY)
    if (offered.length && !(kept && offered.includes(kept))) {
      store.save(CURRENT_KEY, drawRail(offered))
    }
  }, [ids])

  if (candidates.length === 0) return null
  if (!rail) return <RailPlaceholder />

  return (
    <TourRail
      title={rail.title}
      tours={rail.tours}
      seeAllHref={`/${lng}/marketplace?kind=tours` as Route}
    />
  )
}

/** The rail's footprint (title line, row of square cards) while the pick is made. */
export function RailPlaceholder() {
  return (
    <Stack gap="sm" aria-hidden>
      <Skeleton h={22} w="40%" radius="sm" />
      {/* One row, cut at the edge like the rail: the slide widths of `DiscoverRail`. */}
      <div className="flex gap-(--mantine-spacing-sm) overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="aspect-square shrink-0 basis-[60%] from-sm:basis-1/3 from-md:basis-1/4"
            radius="lg"
          />
        ))}
      </div>
    </Stack>
  )
}
