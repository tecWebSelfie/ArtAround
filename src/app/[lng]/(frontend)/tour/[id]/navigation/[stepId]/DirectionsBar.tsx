'use client'

import type { DirectionStep } from '@/lib/tour-directions'
import {
  ActionIcon,
  Box,
  Group,
  Modal,
  Stack,
  Text,
  Timeline,
  TimelineItem,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ChevronLeft, ChevronRight, Footprints, MapPinCheck, MapPinOff, Navigation } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Localized sentence for one direction step. The UI shows it, and voice
 * guidance speaks exactly the same words, so they can never disagree.
 * Room and door names come from the museum map as staff named them.
 */
export function useStepSentence() {
  const { t } = useTranslation('tour-navigation')
  return useCallback(
    (step: DirectionStep, destination: string) => {
      switch (step.kind) {
        case 'start':
          return step.room ? t('Start in {{room}}', { room: step.room }) : t('Start walking')
        case 'enter':
          if (step.door) {
            const values = { door: step.door, room: step.room }
            if (step.turn === 'left') return t('Turn left through {{door}} into {{room}}', values)
            if (step.turn === 'right') return t('Turn right through {{door}} into {{room}}', values)
            return t('Go straight through {{door}} into {{room}}', values)
          }
          if (step.turn === 'left') return t('Turn left into {{room}}', { room: step.room })
          if (step.turn === 'right') return t('Turn right into {{room}}', { room: step.room })
          return t('Continue into {{room}}', { room: step.room })
        case 'arrive':
          if (step.side === 'left') return t('{{destination}} is on your left', { destination })
          if (step.side === 'right') return t('{{destination}} is on your right', { destination })
          return t('{{destination}} is ahead', { destination })
      }
    },
    [t],
  )
}

/** What the strip shows when there are no steps to give. */
export type DirectionsStatus = 'complete' | 'unavailable' | 'no-destination' | 'loading'

/**
 * The navbar's directions space (most of its width, beside the assistant
 * orb). It shows one step at a time; arrows move between steps, GPS progress
 * moves them automatically, and tapping the step opens every step at once.
 * Tour status messages (completed, no route, set your position) are states of
 * this same space rather than extra rows.
 */
export function DirectionsBar({
  steps,
  current,
  onCurrentChange,
  destination,
  status,
  hint,
  action,
}: {
  steps: DirectionStep[]
  current: number
  onCurrentChange: (index: number) => void
  /** Name of the destination, used in the arrival sentence and modal title. */
  destination: string
  status: DirectionsStatus | null
  /** Secondary line, e.g. asking the visitor to confirm a position. */
  hint?: string | null
  /** Button shown beside a status message, e.g. "Take the quiz" once the tour is complete. */
  action?: React.ReactNode
}) {
  const { t } = useTranslation('tour-navigation')
  const sentence = useStepSentence()
  const [opened, { open, close }] = useDisclosure(false)
  const step = steps[current]

  if (status || !step) {
    const message =
      status === 'complete'
        ? t('Tour completed')
        : status === 'unavailable'
          ? t('No route available between these objects')
          : status === 'loading'
            ? t('Finding your route')
            : t('Choose where to go from search')
    const Icon = status === 'complete' ? MapPinCheck : status === 'unavailable' ? MapPinOff : Navigation
    return (
      <Group gap="xs" wrap="nowrap" role="status" aria-live="polite" className="min-h-12 px-1">
        <Icon size={20} aria-hidden />
        <Stack gap={0}>
          <Text fw={600} size="sm">
            {message}
          </Text>
          {hint && (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          )}
        </Stack>
        {action && <Box ml="auto">{action}</Box>}
      </Group>
    )
  }

  const metres = step.kind === 'arrive' ? null : step.metres
  return (
    <>
      <Group gap={4} wrap="nowrap" className="min-h-12">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={t('Previous step')}
          disabled={current === 0}
          onClick={() => onCurrentChange(current - 1)}
        >
          <ChevronLeft size={18} />
        </ActionIcon>
        <UnstyledButton
          onClick={open}
          aria-label={t('Show all directions')}
          aria-describedby="current-direction"
          className="min-w-0 flex-1 rounded-md px-1 py-0.5"
        >
          <Text size="xs" c="dimmed">
            {t('Step {{current}} of {{total}}', { current: current + 1, total: steps.length })}
            {metres ? ` · ${t('about {{metres}} m', { metres })}` : ''}
          </Text>
          <Text id="current-direction" size="sm" fw={600} lineClamp={2} aria-live="polite">
            {sentence(step, destination)}
          </Text>
        </UnstyledButton>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={t('Next step')}
          disabled={current === steps.length - 1}
          onClick={() => onCurrentChange(current + 1)}
        >
          <ChevronRight size={18} />
        </ActionIcon>
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title={t('Directions to {{destination}}', { destination })}
      >
        {hint && (
          <Text size="sm" c="dimmed" mb="sm">
            {hint}
          </Text>
        )}
        <Timeline active={current} bulletSize={22} lineWidth={2}>
          {steps.map((item, index) => (
            <TimelineItem
              key={`${item.kind}-${index}`}
              bullet={item.kind === 'arrive' ? <MapPinCheck size={12} /> : <Footprints size={12} />}
              title={
                <UnstyledButton
                  onClick={() => {
                    onCurrentChange(index)
                    close()
                  }}
                  aria-current={index === current ? 'step' : undefined}
                >
                  <Text size="sm" fw={index === current ? 700 : 500}>
                    {sentence(item, destination)}
                  </Text>
                </UnstyledButton>
              }
            >
              {item.kind !== 'arrive' && (
                <Box>
                  <Text size="xs" c="dimmed">
                    {t('about {{metres}} m', { metres: item.metres })}
                  </Text>
                </Box>
              )}
            </TimelineItem>
          ))}
        </Timeline>
      </Modal>
    </>
  )
}
