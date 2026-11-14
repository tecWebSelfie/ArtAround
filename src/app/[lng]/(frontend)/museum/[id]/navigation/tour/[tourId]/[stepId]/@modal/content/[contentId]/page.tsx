import { TranslationNotice } from '@/components/TranslationNotice'
import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ContentVersion } from '@/components/expansion/ContentVersion'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { ContentUnlock } from '@/components/payments/ContentUnlock'
import { contentObjectId, tourContentPath, withNavigationPosition } from '@/lib/tour-navigation'
import { redirect } from 'next/navigation'
import { getNavigationDocument, getNavigationTour, requireTourStep } from '../../../../../../data'
import { NavigationObjectActions } from '../../../../../../NavigationObjectActions'
import { NavigationModal } from '../../../../../../NavigationModal'

/** Direct/reloaded tour URLs render content in the parallel modal slot. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; tourId: string; stepId: string; contentId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, tourId, stepId, contentId } = await params
  const tour = await getNavigationTour(tourId, lng)
  const step = requireTourStep(tour, stepId, { lng, museumId: id }, await searchParams)
  const path = tourContentPath(lng, tour, step, contentId)
  if (path.endsWith('/open')) redirect(withNavigationPosition(path, await searchParams))
  const content = await getNavigationDocument('contents', contentId, lng)
  return (
    <NavigationModal kind="content">
      <TranslationNotice collection="contents" id={content.id} lng={lng} />
      {/* Simpler / Shorter / For children: swaps the body for another version. */}
      <ContentVersion content={content}>
        <ContentDetailsModalContent content={content} lng={lng} />
      </ContentVersion>
      {/* Locked: buying comes right after the locked notice. */}
      <ContentUnlock content={content} lng={lng} next={path} />
      {/* "Tell me more" pills and the extra text, right after the body. */}
      <ContentExpansion target="contents" id={content.id} locked={!content.body} />
      <NavigationObjectActions objectId={contentObjectId(content)} />
    </NavigationModal>
  )
}
