'use client'

import { Select, Text, TimelineItem, type TimelineItemProps } from '@mantine/core'
import { DoorOpen } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useEntranceNames } from '@/hooks/use-named-entrances'

/** A placed entrance of the museum map, as the server sends it to the editor. */
export type EntranceChoice = { id: string; name: string | null }

/**
 * Where the tour starts, as the first item of the stops timeline (the editor
 * counterpart of the "Start" bookend of the navigation's tour progress): a
 * door for a bullet instead of a number, and no grip, arrows or bin, since it
 * isn't a stop and always comes first. It sits outside the sortable stops, so
 * dragging can never put a stop before it.
 *
 * With two or more placed entrances it chooses one of them, or automatically
 * the one nearest the first stop (the empty value, the default), which
 * follows the stops if the author reorders them; with one it just names it;
 * with none the caller leaves it out. A saved entrance the staff later
 * removed reads as automatic: navigation already falls back so.
 *
 * Like the stops, it forwards the layout props Mantine's Timeline passes to
 * its direct children.
 */
export function StartEntranceItem({
  entrances,
  value,
  onChange,
  ...timelineProps
}: Omit<TimelineItemProps, 'onChange'> & {
  /** The museum's placed entrances: at least one. */
  entrances: EntranceChoice[]
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('editing')
  const named = useEntranceNames(entrances)
  const titleId = useId()
  const automatic = 'automatic'
  const known = named.some((entrance) => entrance.id === value)
  return (
    <TimelineItem
      {...timelineProps}
      bullet={<DoorOpen size={14} aria-hidden />}
      // The item's title is the select's visible label.
      title={<span id={titleId}>{t('Start entrance')}</span>}
    >
      {named.length > 1 ? (
        <Select
          mt="xs"
          aria-labelledby={titleId}
          description={t('Where the tour begins: its first stop is reached from here.')}
          data={[
            { value: automatic, label: t('Nearest to the first stop') },
            ...named.map((entrance) => ({ value: entrance.id, label: entrance.name })),
          ]}
          value={known ? value : automatic}
          allowDeselect={false}
          onChange={(next) => onChange(!next || next === automatic ? '' : next)}
        />
      ) : (
        <Text size="sm" c="dimmed">
          {named[0]?.name}
        </Text>
      )}
    </TimelineItem>
  )
}
