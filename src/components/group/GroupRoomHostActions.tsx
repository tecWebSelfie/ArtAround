'use client'

import type { Route } from 'next'
import { ProgressLink } from '@/components/navigation/ProgressLink'
import { useParams } from 'next/navigation'
import { Button, Stack, Text } from '@mantine/core'
import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Host-only controls for the group waiting room. An old or no-longer-entitled
 * room stays recoverable through the tour page, but cannot release guests into
 * a paid tour.
 */
export function GroupRoomHostActions({
  tourId,
  canStart,
  started,
  onStart,
  onEnd,
}: {
  tourId: string
  canStart: boolean
  started: boolean
  onStart: () => void
  onEnd: () => void
}) {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()

  return (
    <Stack gap="xs">
      {canStart ? (
        <Button size="md" leftSection={<Play size={18} />} onClick={onStart}>
          {started ? t('Back to the tour') : t('Start the tour')}
        </Button>
      ) : (
        <Stack gap="xs">
          <Text size="sm" role="status">
            {t('The host needs to unlock this tour before starting the group.')}
          </Text>
          <Button
            component={ProgressLink}
            href={`/${lng}/tour/${tourId}` as Route}
            variant="default"
          >
            {t('Review tour access')}
          </Button>
        </Stack>
      )}
      <Button variant="subtle" color="red" onClick={onEnd}>
        {t('End the group tour')}
      </Button>
    </Stack>
  )
}
