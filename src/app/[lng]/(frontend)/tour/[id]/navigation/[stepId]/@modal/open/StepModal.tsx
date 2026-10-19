'use client'

import { ContentExpansion } from '@/components/expansion/ContentExpansion'
import { ContentVersion } from '@/components/expansion/ContentVersion'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { Content } from '@/payload-types'
import { Button, Stack } from '@mantine/core'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import { contentObjectId, withNavigationPosition } from '@/lib/tour-navigation'
import { NavigationObjectActions } from '../../../NavigationObjectActions'

/** Shows the next ordered content and advances only when the visitor confirms. */
export function StepModal({
  step: content,
  nextHref,
  lastStep = false,
}: {
  step: Content
  nextHref?: Route
  lastStep?: boolean
}) {
  const router = useRouter()
  const search = useSearchParams()
  const { t } = useTranslation('tour-navigation')
  return (
    <Stack>
      <ContentVersion content={content}>
        <ContentDetailsModalContent content={content} />
      </ContentVersion>
      <ContentExpansion target="contents" id={content.id} locked={!content.body} />
      <NavigationObjectActions objectId={contentObjectId(content)} />
      {nextHref && (
        <Button
          onClick={() => {
            const params = new URLSearchParams(search)
            params.delete('to')
            router.replace(withNavigationPosition(nextHref, params.toString()) as Route)
          }}
        >
          {lastStep ? t('Complete tour') : t('Go to next step')}
        </Button>
      )}
    </Stack>
  )
}
