import { TranslationNotice } from '@/components/TranslationNotice'
import { subjectsOfWork } from '@/lib/subjects'
import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getNavigationDocument, getNavigationTour, requireTourStep } from '../../../../../../data'
import { NavigationObjectActions } from '../../../../../../NavigationObjectActions'
import { NavigationModal } from '../../../../../../NavigationModal'

/** Direct/reloaded tour URLs render object details without losing the map shell. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; tourId: string; stepId: string; objectId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, tourId, stepId, objectId } = await params
  const tour = await getNavigationTour(tourId, lng)
  requireTourStep(tour, stepId, { lng, museumId: id }, await searchParams)
  const object = await getNavigationDocument('objects', objectId, lng)
  return (
    <NavigationModal kind="work">
      <TranslationNotice collection="objects" id={object.id} lng={lng} />
      <ObjectDetailsContent
        object={object}
        subjects={await subjectsOfWork(object, lng)}
        hideContents
        subjectLinks={false}
      />
      {/* Extra text about the object, drawn from the contents this visitor may read. */}
      <ContentExpansion target="objects" id={object.id} />
      <NavigationObjectActions objectId={object.id} contents={object.contents} />
    </NavigationModal>
  )
}
