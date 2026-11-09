'use client'

import type { DirectionStep } from '@/lib/tour-directions'
import {
  ActionIcon,
  Box,
  Group,
  Modal,
  Text,
  Timeline,
  TimelineItem,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  ChevronLeft,
  ChevronRight,
  Footprints,
  MapPinCheck,
  MapPinOff,
  Navigation,
} from 'lucide-react'
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

/** Keep the assistant mounted while route status changes; only its layout moves. */
function DirectionsLayout({
  children,
  trailingControl,
  active = false,
}: {
  children: React.ReactNode
  trailingControl?: React.ReactNode
  active?: boolean
}) {
  return (
    <div className="@container">
      <div
        className={
          active
            ? 'grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 @min-[22rem]:grid-cols-[auto_minmax(0,1fr)_auto_auto]'
            : 'flex items-center gap-2'
        }
      >
        <div className={active ? 'contents' : 'min-w-0 flex-1'}>{children}</div>
        <div
          className={
            active
              ? 'col-start-3 row-start-2 justify-self-end @min-[22rem]:col-start-4 @min-[22rem]:row-start-1'
              : 'ml-auto shrink-0'
          }
        >
          {trailingControl}
        </div>
      </div>
    </div>
  )
}

/** What the strip shows instead of steps. */
export type DirectionsStatus =
  'complete' | 'no-position' | 'unavailable' | 'no-destination' | 'loading'

/**
 * The navbar's directions space (most of its width, beside the assistant
 * orb). It shows one step at a time; arrows move between steps, GPS progress
 * moves them automatically, and tapping the step opens every step at once.
 * Tour status messages (completed, no route) are states of this same space
 * rather than extra rows. Without a confirmed position or a destination there
 * are no directions to give, so the whole strip becomes the call to choose them.
 */
export function DirectionsBar({
  steps,
  current,
  onCurrentChange,
  destination,
  status,
  onSearch,
  action,
  trailingControl,
}: {
  steps: DirectionStep[]
  current: number
  onCurrentChange: (index: number) => void
  /** Name of the destination, used in the arrival sentence and modal title. */
  destination: string
  status: DirectionsStatus | null
  /** Runs when the visitor taps the `no-position` / `no-destination` call to action (opens search). */
  onSearch?: () => void
  /** Button shown beside a status message, e.g. "Take the quiz" once the tour is complete. */
  action?: React.ReactNode
  /** Assistant shares the arrow row when enlarged text needs the full width. */
  trailingControl?: React.ReactNode
}) {
  const { t } = useTranslation('tour-navigation')
  const sentence = useStepSentence()
  const [opened, { open, close }] = useDisclosure(false)
  const step = steps[current]

  if (status === 'no-position' || status === 'no-destination') {
    // Directions need a start and an end, asked for in that order: first the
    // position, then (if the tour doesn't give one) where to go. Accent-coloured
    // and tappable, unlike the plain status messages, so each reads as the one
    // thing to do before guidance can start. Both are chosen from search.
    const position = status === 'no-position'
    return (
      <DirectionsLayout trailingControl={trailingControl}>
        <UnstyledButton
          onClick={onSearch}
          className="flex min-h-12 w-full items-center gap-2 rounded-md px-1 text-(--mantine-color-orange-light-color)"
        >
          {position ? (
            <MapPinOff size={20} aria-hidden className="shrink-0" />
          ) : (
            <Navigation size={20} aria-hidden className="shrink-0" />
          )}
          <Text size="sm" fw={600} lineClamp={2}>
            {position
              ? t('Open an object and set it as your position')
              : t('Choose where to go from search')}
          </Text>
          <ChevronRight size={18} aria-hidden className="ml-auto shrink-0" />
        </UnstyledButton>
      </DirectionsLayout>
    )
  }

  if (status || !step) {
    const message =
      status === 'complete'
        ? t('Tour completed')
        : status === 'unavailable'
          ? t('No route available between these objects')
          : status === 'loading'
            ? t('Finding your route')
            : t('Choose where to go from search')
    const Icon =
      status === 'complete' ? MapPinCheck : status === 'unavailable' ? MapPinOff : Navigation
    return (
      <DirectionsLayout trailingControl={trailingControl}>
        <Group gap="xs" wrap="nowrap" role="status" aria-live="polite" className="min-h-12 px-1">
          <Icon size={20} aria-hidden />
          <Text fw={600} size="sm">
            {message}
          </Text>
          {action && <Box ml="auto">{action}</Box>}
        </Group>
      </DirectionsLayout>
    )
  }

  const metres = step.kind === 'arrive' ? null : step.metres
  return (
    <>
      {/* Container width follows text scaling and the assistant's footprint.
          On narrow strips, read the sentence above the arrows instead of
          squeezing it between two minimum-size touch targets. */}
      <DirectionsLayout active trailingControl={trailingControl}>
        <ActionIcon
          className="row-start-2 @min-[22rem]:row-start-1"
          // Directions remain tappable while walking, including compact footers.
          size={44}
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
          className="col-span-3 row-start-1 min-h-11 min-w-0 rounded-md px-1 py-0.5 @min-[22rem]:col-span-1 @min-[22rem]:col-start-2"
        >
          <Text size="xs" c="dimmed">
            {t('Step {{current}} of {{total}}', { current: current + 1, total: steps.length })}
            {metres ? ` · ${t('about {{metres}} m', { metres })}` : ''}
          </Text>
          <Text
            id="current-direction"
            size="sm"
            fw={600}
            className="wrap-anywhere @min-[22rem]:line-clamp-2"
            aria-live="polite"
          >
            {sentence(step, destination)}
          </Text>
        </UnstyledButton>
        <ActionIcon
          size={44}
          variant="subtle"
          color="gray"
          className="col-start-2 row-start-2 justify-self-end @min-[22rem]:col-start-3 @min-[22rem]:row-start-1"
          aria-label={t('Next step')}
          disabled={current === steps.length - 1}
          onClick={() => onCurrentChange(current + 1)}
        >
          <ChevronRight size={18} />
        </ActionIcon>
      </DirectionsLayout>

      <Modal
        opened={opened}
        onClose={close}
        title={t('Directions to {{destination}}', { destination })}
      >
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
