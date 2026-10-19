import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ContentVersion } from '@/components/expansion/ContentVersion'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import {
  contentObjectId,
  tourContentPath,
  tourStepIndex,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { notFound, redirect } from 'next/navigation'
import { getNavigationDocument, getNavigationTour } from '../../../../data'
import { NavigationObjectActions } from '../../../../NavigationObjectActions'
import { NavigationModal } from '../../../NavigationModal'

/** Direct/reloaded tour URLs render content in the parallel modal slot. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; stepId: string; contentId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, stepId, contentId } = await params
  const tour = await getNavigationTour(id)
  const step = tourStepIndex(stepId, tour.contents.length)
  if (step === null) notFound()
  const path = tourContentPath(lng, tour, step, contentId)
  if (path.endsWith('/open')) redirect(withNavigationPosition(path, await searchParams))
  const content = await getNavigationDocument('contents', contentId, lng)
  return (
    <NavigationModal>
      {/* Simpler / Shorter / For children: swaps the body for another version. */}
      <ContentVersion content={content}>
        <ContentDetailsModalContent content={content} />
      </ContentVersion>
      {/* "Tell me more" pills and the extra text, right after the body. */}
      <ContentExpansion target="contents" id={content.id} locked={!content.body} />
      <NavigationObjectActions objectId={contentObjectId(content)} />
    </NavigationModal>
  )
}
