'use client'

import type { Object as MuseumObject } from '@/payload-types'
import { Button, Stack } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  tourContentPath,
  tourNavigationPath,
  tourStepIndex,
  withNavigationValue,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { useTourNavigationData } from './TourNavigationShell'
import { useIsGroupGuest } from '@/components/group/GroupProvider'

/**
 * Shared actions for object and content panels; choosing a place is always explicit.
 * Group guests get none: position and destination are the host's (GroupProvider).
 */
export function NavigationObjectActions({
  objectId,
  contents,
}: {
  objectId: string | null
  contents?: MuseumObject['contents']
}) {
  const data = useTourNavigationData()
  const { lng, id: tourId, stepId } = useParams<{ lng: string; id: string; stepId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const guest = useIsGroupGuest()
  const step = data ? tourStepIndex(stepId, data.tour.contents.length) : null
  if (!data || step === null || guest) return null
  const base = tourNavigationPath(lng, tourId, step)
  const href = (path: string) => withNavigationPosition(path, search.toString())
  const contentHref = (id: string) => href(tourContentPath(lng, data.tour, step, id))
  const setPosition = (id: string | null) =>
    router.replace(withNavigationValue(base, search.toString(), 'at', id), { scroll: false })
  const navigateTo = (id: string | null) =>
    router.replace(withNavigationValue(base, search.toString(), 'to', id), { scroll: false })
  const canLocate = objectId !== null && data.placedObjectIds.has(objectId)
  // String relationships are common in shallow Payload reads; the catalog has
  // the localized title summary without loading the full content document.
  const catalogContents = data.catalog.find((object) => object.id === objectId)?.contents
  return (
    <Stack>
      {contents?.map((content) => (
        <Button
          variant="subtle"
          key={typeof content === 'string' ? content : content.id}
          onClick={() =>
            router.push(contentHref(typeof content === 'string' ? content : content.id))
          }
        >
          {typeof content === 'string'
            ? (catalogContents?.find(({ id }) => id === content)?.title ?? t('Read content'))
            : content.title}
        </Button>
      ))}
      <Button
        variant="default"
        disabled={!canLocate}
        onClick={() => objectId && setPosition(objectId)}
      >
        {t('Set as my position')}
      </Button>
      <Button disabled={!canLocate} onClick={() => objectId && navigateTo(objectId)}>
        {canLocate ? t('Navigate here') : t('This object is not placed on the map')}
      </Button>
    </Stack>
  )
}
