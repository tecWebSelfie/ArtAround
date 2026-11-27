'use client'

import type { PlannedTour } from '@/lib/tour-plan'
import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import { ReadingProfile } from '@/components/group/ReadingProfile'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { tourCopyPath } from '@/lib/tour-routes'
import { ACCESSIBILITY_COLOR, TOUR_GRADIENT } from '@/theme'
import { Badge, Button, Container, Group, Stack, Text, Timeline, Title } from '@mantine/core'
import {
  Accessibility,
  Baby,
  Clock,
  Footprints,
  MapPin,
  MapPinCheck,
  Pencil,
  Play,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ComponentProps, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { PLAN_PAGE_CLASS } from './plan-visit-state'

/**
 * The planned visit, before it starts: its stops and time, the answers the
 * start will honour (step-free route, a child's reading level), and the ways
 * on: change the answers, customize the stops, start alone, or start as a
 * group. Customizing opens the visitor's own copy of the planned tour in the
 * tour editor (`tourCopyPath`, a visit copy), signed in or not.
 */
export function PlanPreview({
  plan,
  headingRef,
  wheelchair,
  ages,
  reader,
  onReaderChange,
  onChange,
  onStart,
  navigationQuery,
}: {
  plan: PlannedTour
  /** Focused when the preview replaces the form. */
  headingRef: Ref<HTMLHeadingElement>
  wheelchair: boolean
  ages: number[]
  reader: ComponentProps<typeof ReadingProfile>['value']
  onReaderChange: (value: ComponentProps<typeof ReadingProfile>['value']) => void
  onChange: () => void
  onStart: () => void
  /** The navigation query a group start carries too (route, reading profile). */
  navigationQuery: string
}) {
  const { t } = useTranslation('plan-visit')
  const { lng } = useParams<{ lng: string }>()
  return (
    <div className={PLAN_PAGE_CLASS}>
      <Container size="xs" py="xl">
        <Stack gap="lg">
          <BackToNavigator />
          <Stack gap="xs">
            <Title order={1} ref={headingRef} tabIndex={-1} className="outline-none">
              {plan.title}
            </Title>
            {plan.description && <Text c="dimmed">{plan.description}</Text>}
            {/* At a glance, as on the tour page: the time and stops, and the
              answers the start will honour, so the visitor sees they were
              heard (icon + words, never color alone). */}
            <Group gap="xs">
              <Badge size="lg" variant="light" leftSection={<Clock size={14} aria-hidden />}>
                {t('About {{count}} minutes', { count: plan.totalMinutes })}
              </Badge>
              <Badge
                size="lg"
                variant="light"
                color="gray"
                leftSection={<MapPin size={14} aria-hidden />}
              >
                {t('{{count}} stops', { count: plan.stops.length })}
              </Badge>
              {wheelchair && (
                <Badge
                  size="lg"
                  variant="light"
                  color={ACCESSIBILITY_COLOR}
                  leftSection={<Accessibility size={14} aria-hidden />}
                >
                  {t('Step-free route')}
                </Badge>
              )}
              {reader !== 'adult' && (
                <Badge
                  size="lg"
                  variant="light"
                  color="gray"
                  leftSection={<Baby size={14} aria-hidden />}
                >
                  {t('Child aged {{age}}', { age: Number(reader) })}
                </Badge>
              )}
            </Group>
          </Stack>
          {/* Exposed as a list, so screen readers announce the number of stops. */}
          <Timeline active={plan.stops.length} bulletSize={22} lineWidth={2} role="list">
            {plan.stops.map((stop, index) => (
              <Timeline.Item
                key={stop.id}
                role="listitem"
                bullet={
                  index === plan.stops.length - 1 ? (
                    <MapPinCheck size={12} aria-hidden />
                  ) : (
                    <Footprints size={12} aria-hidden />
                  )
                }
                title={stop.title}
              >
                <Text size="sm" c="dimmed">
                  {[stop.objectName, stop.room, t('{{count}} min read', { count: stop.minutes })]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
          {/* Next to the stops it changes: drop, swap or reorder some of them
              (a stop they don't like, too hard, …) without new answers. */}
          <Button
            component={Link}
            href={tourCopyPath(lng, plan.id, { visit: true, navigation: navigationQuery })}
            variant="subtle"
            leftSection={<Pencil size={16} aria-hidden />}
            className="self-start"
          >
            {t('Customize the stops')}
          </Button>
          <ReadingProfile ages={ages} value={reader} onChange={onReaderChange} />
          <Group grow>
            <Button variant="default" size="md" onClick={onChange}>
              {t('Change')}
            </Button>
            {/* The tour gradient: starting a tour (DESIGN.md → tour identity). */}
            <Button
              size="md"
              variant="gradient"
              gradient={TOUR_GRADIENT}
              rightSection={<Play size={16} aria-hidden />}
              onClick={onStart}
            >
              {t('Start the visit')}
            </Button>
          </Group>
          <StartGroupButton tourId={plan.id} navigationQuery={navigationQuery} />
        </Stack>
      </Container>
    </div>
  )
}
