import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ContentVersion } from '@/components/expansion/ContentVersion'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { contentObjectId } from '@/lib/tour-navigation'
import { getNavigationDocument } from '@/app/[lng]/(frontend)/tour/[id]/navigation/data'
import { NavigationObjectActions } from '@/app/[lng]/(frontend)/tour/[id]/navigation/NavigationObjectActions'
import { NavigationModal } from '@/app/[lng]/(frontend)/tour/[id]/navigation/[stepId]/NavigationModal'

/**
 * A content over the free map (also the target of the detail pages' "Find it
 * on the map", which presets `?to=` to its object). Same panel as in a tour.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ lng: string; id: string; contentId: string }>
}) {
  const { lng, contentId } = await params
  const content = await getNavigationDocument('contents', contentId, lng)
  return (
    <NavigationModal>
      {/* Simpler / Shorter / For children: swaps the body for another version. */}
      <ContentVersion content={content}>
        <ContentDetailsModalContent content={content} />
      </ContentVersion>
      <ContentExpansion target="contents" id={content.id} locked={!content.body} />
      <NavigationObjectActions objectId={contentObjectId(content)} />
    </NavigationModal>
  )
}
