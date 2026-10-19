import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getNavigationDocument, getNavigationTour } from '../../../../data'
import { tourStepIndex } from '@/lib/tour-navigation'
import { notFound } from 'next/navigation'
import { NavigationObjectActions } from '../../../../NavigationObjectActions'
import { NavigationModal } from '../../../NavigationModal'

/** Direct/reloaded tour URLs render object details without losing the map shell. */
export default async function Page({
  params,
}: {
  params: Promise<{ lng: string; id: string; stepId: string; objectId: string }>
}) {
  const { lng, id, stepId, objectId } = await params
  const tour = await getNavigationTour(id)
  if (tourStepIndex(stepId, tour.contents.length) === null) notFound()
  const object = await getNavigationDocument('objects', objectId, lng)
  return (
    <NavigationModal>
      <ObjectDetailsContent object={object} hideContents />
      {/* Extra text about the object, drawn from the contents this visitor may read. */}
      <ContentExpansion target="objects" id={object.id} />
      <NavigationObjectActions objectId={object.id} contents={object.contents} />
    </NavigationModal>
  )
}
