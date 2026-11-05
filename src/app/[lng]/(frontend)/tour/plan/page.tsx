import { getSession } from '@/lib/session'
import { normalizeLocale } from '@/lib/localized'
import { lockedMuseumId } from '@/lib/museum-mode'
import { PlanVisitPage } from './PlanVisitPage'

/**
 * "Plan my visit": a short form (museum, time, interests, step-free route,
 * then optionally first or returning visit and the group) that
 * `/api/plan-tour` turns into a saved tour. Meant for someone who just opened
 * the app inside a museum, so it is reached from the navigator home. In
 * museum mode the museum is fixed and named in the intro; otherwise the
 * visitor picks it (the city tells same-named museums apart), or names it in
 * their interests.
 */
export default async function PlanVisit({ params }: PageProps<'/[lng]/tour/plan'>) {
  const { lng } = await params
  const museumsRead = getSession().then(({ payload }) =>
    payload.find({
      collection: 'museums',
      limit: 200,
      depth: 0,
      locale: normalizeLocale(lng) ?? 'en',
      select: { name: true, location: true },
      sort: 'name',
    }),
  )
  const [{ docs }, lockedMuseum] = await Promise.all([museumsRead, lockedMuseumId()])
  return (
    <PlanVisitPage
      museums={docs.map((museum) => ({
        value: museum.id,
        name: museum.name,
        city: museum.location?.city ?? null,
      }))}
      lockedMuseum={lockedMuseum}
    />
  )
}
