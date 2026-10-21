'use client'

import { Button, List, Modal, Stack, Text, ThemeIcon } from '@mantine/core'
import { MapPinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Shown when the tour's cursor reaches stops that can no longer be visited
 * (`unavailableStops`: the content is gone or its object left the map). It
 * names them, says they will be skipped and, for whoever leads (a visitor on
 * their own or a group's host), moves the cursor past them in one tap. Group
 * guests only read it: the host's skip moves them along (Follow-the-Host).
 *
 * Not dismissable on its own: the stop has no route, so the only ways on are
 * skipping it or leaving the tour.
 */
export function SkippedStopModal({
  titles,
  completes,
  guest,
  onSkip,
}: {
  /** The consecutive unavailable stops from the cursor on, by title. */
  titles: string[]
  /** Skipping them finishes the tour (no visitable stop left). */
  completes: boolean
  guest: boolean
  onSkip: () => void
}) {
  const { t } = useTranslation('tour-navigation')
  return (
    <Modal
      opened
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      title={t('These stops can no longer be visited', { count: titles.length })}
    >
      <Stack gap="md">
        <ThemeIcon size={48} radius="xl" variant="light" color="gray" aria-hidden>
          <MapPinOff size={24} />
        </ThemeIcon>
        <Text size="sm">
          {t('The tour skips these stops because their works are no longer on show', {
            count: titles.length,
          })}
        </Text>
        <List size="sm" spacing={4}>
          {titles.map((title, index) => (
            <List.Item key={index}>
              <Text span size="sm" fw={500}>
                {title}
              </Text>
            </List.Item>
          ))}
        </List>
        {guest ? (
          <Text size="sm" c="dimmed">
            {t('Your guide will move on to the next stop')}
          </Text>
        ) : (
          <Button onClick={onSkip}>
            {completes ? t('Skip and finish the tour') : t('Skip to the next stop')}
          </Button>
        )}
      </Stack>
    </Modal>
  )
}
