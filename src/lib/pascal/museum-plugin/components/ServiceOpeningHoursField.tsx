'use client'

import { TimeInput } from '@mantine/dates'
import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { WEEK_DAYS, type ServiceOpeningHours, type ServiceNode, type WeekDay } from '../ServiceNode'

type ServiceNodeValue = z.infer<typeof ServiceNode>

type Interval = { opening: string; closing: string }
type Schedule = Record<WeekDay, Interval[]>

const EMPTY_SCHEDULE: Schedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
}

/** Days the stored JSON omitted read as "closed"; the form always edits all seven. */
function toSchedule(value?: ServiceOpeningHours): Schedule {
  const schedule: Schedule = { ...EMPTY_SCHEDULE }
  for (const day of WEEK_DAYS) {
    schedule[day] = (value?.[day] ?? []).map((row) => ({
      opening: row?.opening ?? '',
      closing: row?.closing ?? '',
    }))
  }
  return schedule
}

/** Drop empty days so an unedited service keeps a small JSON payload. */
function fromSchedule(schedule: Schedule, notes: string): ServiceOpeningHours {
  const value: ServiceOpeningHours = {}
  for (const day of WEEK_DAYS) {
    const rows = schedule[day].filter((row) => row.opening || row.closing)
    if (rows.length > 0) value[day] = rows
  }
  if (notes.trim()) value.notes = notes
  return value
}

/** Plain-text summary for the field button, e.g. "09:00–18:00" or "No hours yet". */
function summarise(value?: ServiceOpeningHours): string | null {
  const first = WEEK_DAYS.map((day) => value?.[day]?.[0]).find(Boolean)
  return first ? `${first.opening || '?'}–${first.closing || '?'}` : null
}

function OpeningHoursForm({
  value,
  onSubmit,
  onCancel,
}: {
  value?: ServiceOpeningHours
  onSubmit: (next: ServiceOpeningHours) => void
  onCancel: () => void
}) {
  const { t } = useTranslation('map-editor')
  // Literal `t()` calls (not `capitalize(day)`) so extract sees the seven keys.
  const dayLabel: Record<WeekDay, string> = {
    monday: t('Monday'),
    tuesday: t('Tuesday'),
    wednesday: t('Wednesday'),
    thursday: t('Thursday'),
    friday: t('Friday'),
    saturday: t('Saturday'),
    sunday: t('Sunday'),
  }
  const [schedule, setSchedule] = useState<Schedule>(() => toSchedule(value))
  const [notes, setNotes] = useState(value?.notes ?? '')

  const setRow = (day: WeekDay, index: number, patch: Partial<Interval>) =>
    setSchedule((current) => ({
      ...current,
      [day]: current[day].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))
  const addRow = (day: WeekDay) =>
    setSchedule((current) => ({
      ...current,
      [day]: [...current[day], { opening: '09:00', closing: '18:00' }],
    }))
  const removeRow = (day: WeekDay, index: number) =>
    setSchedule((current) => ({
      ...current,
      [day]: current[day].filter((_, i) => i !== index),
    }))

  return (
    <Stack gap="sm">
      {WEEK_DAYS.map((day) => (
        <Stack key={day} gap={4}>
          <Group justify="space-between">
            <Text fw={500} size="sm">
              {dayLabel[day]}
            </Text>
            <ActionIcon
              aria-label={t('Add an interval')}
              size="sm"
              variant="subtle"
              onClick={() => addRow(day)}
            >
              <Plus size={14} />
            </ActionIcon>
          </Group>
          {schedule[day].length === 0 ? (
            <Text c="dimmed" size="xs">
              {t('Closed')}
            </Text>
          ) : (
            schedule[day].map((row, index) => (
              <Group key={index} gap="xs" wrap="nowrap">
                <TimeInput
                  aria-label={`${dayLabel[day]} ${t('opening')}`}
                  size="xs"
                  value={row.opening}
                  onChange={(event) =>
                    setRow(day, index, { opening: event.currentTarget.value })
                  }
                />
                <Text size="xs">–</Text>
                <TimeInput
                  aria-label={`${dayLabel[day]} ${t('closing')}`}
                  size="xs"
                  value={row.closing}
                  onChange={(event) =>
                    setRow(day, index, { closing: event.currentTarget.value })
                  }
                />
                <ActionIcon
                  aria-label={t('Remove this interval')}
                  color="red"
                  size="sm"
                  variant="subtle"
                  onClick={() => removeRow(day, index)}
                >
                  <Trash2 size={14} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>
      ))}
      <Textarea
        label={t('Notes')}
        maxLength={100}
        minRows={2}
        value={notes}
        onChange={(event) => setNotes(event.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button onClick={() => onSubmit(fromSchedule(schedule, notes))}>{t('Save')}</Button>
      </Group>
    </Stack>
  )
}

/**
 * Parametric inspector field *and* the services-panel card action: a button that
 * opens the weekly opening-hours form in a modal. Reusing one component keeps
 * the inspector and the panel editing the exact same node data shape.
 */
export function ServiceOpeningHoursField({
  node,
  onUpdate,
}: {
  node: ServiceNodeValue
  onUpdate: (patch: Partial<ServiceNodeValue>) => void
}) {
  const { t } = useTranslation('map-editor')
  const summary = summarise(node.openingHours)

  const openForm = () => {
    let modalId: string | undefined
    modalId = modals.open({
      title: t('Opening hours'),
      size: 'lg',
      children: (
        <OpeningHoursForm
          value={node.openingHours}
          onCancel={() => modalId && modals.close(modalId)}
          onSubmit={(openingHours) => {
            onUpdate({ openingHours })
            if (modalId) modals.close(modalId)
          }}
        />
      ),
    })
  }

  return (
    <Tooltip label={t('Edit opening hours')}>
      <Button
        fullWidth
        justify="flex-start"
        leftSection={<Clock size={16} />}
        variant="default"
        onClick={openForm}
      >
        {summary ?? t('Set opening hours')}
      </Button>
    </Tooltip>
  )
}
