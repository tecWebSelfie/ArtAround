import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getNavigationDocument } from '../../../data'
import { NavigationObjectActions } from '../../../NavigationObjectActions'
import { NavigationModal } from '../../../NavigationModal'

/** Object details over the free map; reloads keep the map shell. */
export default async function Page({
  params,
}: {
  params: Promise<{ lng: string; id: string; objectId: string }>
}) {
  const { lng, objectId } = await params
  const object = await getNavigationDocument('objects', objectId, lng)
  return (
    <NavigationModal>
      <ObjectDetailsContent object={object} hideContents />
      <ContentExpansion target="objects" id={object.id} />
      <NavigationObjectActions objectId={object.id} contents={object.contents} />
    </NavigationModal>
  )
}
