import { TranslationNotice } from '@/components/TranslationNotice'
import { ContentUnlock } from '@/components/payments/ContentUnlock'
import { StepModal } from './StepModal'
import { getNavigationDocument, getNavigationTour, requireTourStep } from '../../../../../data'
import { tourNavigationPath } from '@/lib/tour-navigation'
import { notFound } from 'next/navigation'
import { NavigationModal } from '../../../../../NavigationModal'

/** The `open` route is reserved for the next ordered tour item; completion advances the URL cursor. */
export default async function OpenStepModal({
  params,
  searchParams,
}: PageProps<'/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]'>) {
  const { lng, id: museumId, tourId, stepId } = await params
  const tour = await getNavigationTour(tourId, lng)
  const step = requireTourStep(tour, stepId, { lng, museumId }, await searchParams)
  if (step === tour.contents.length) notFound()
  const contentOrId = tour.contents[step]
  const content = await getNavigationDocument(
    'contents',
    typeof contentOrId === 'object' ? contentOrId.id : contentOrId,
    lng,
  )

  return (
    <NavigationModal kind="stop">
      <TranslationNotice collection="contents" id={content.id} lng={lng} />
      <StepModal
        step={content}
        nextHref={tourNavigationPath(lng, museumId, tourId, step + 1)}
        lastStep={step + 1 === tour.contents.length}
        quizFrom={tour.quiz?.questions?.length ? step + 1 : undefined}
        unlock={
          <ContentUnlock
            content={content}
            lng={lng}
            next={`${tourNavigationPath(lng, museumId, tourId, step)}/open`}
          />
        }
      />
    </NavigationModal>
  )
}
