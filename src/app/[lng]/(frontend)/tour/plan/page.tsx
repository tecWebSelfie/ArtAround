import { getSession } from '@/lib/session'
import { normalizeLocale } from '@/lib/localized'
import { lockedMuseumId } from '@/lib/museum-mode'
import { PlanVisitPage } from './PlanVisitPage'

/**
 * "Plan my visit": a short form (time, first or returning visit, group,
 * interests, wheelchair) that `/api/plan-tour` turns into a saved tour. Meant
 * for someone who just opened the app inside a museum, so it is reached from
 * the navigator home. In museum mode the museum is fixed; otherwise the
 * visitor picks it, or names it in their interests.
 */
export default async function PlanVisit({ params }: PageProps<'/[lng]/tour/plan'>) {
  const { lng } = await params
  const { payload } = await getSession()
  const { docs } = await payload.find({
    collection: 'museums',
    limit: 200,
    depth: 0,
    locale: normalizeLocale(lng) ?? 'en',
    select: { name: true },
    sort: 'name',
  })
  return (
    <PlanVisitPage
      museums={docs.map((museum) => ({ value: museum.id, label: museum.name }))}
      lockedMuseum={await lockedMuseumId()}
    />
  )
}
