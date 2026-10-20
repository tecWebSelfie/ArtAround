'use client'

import { formatPrice } from '@/lib/price'
import { ADD_PARAM, DRAFT_PARAM, newStopHref, tourPickerHref } from '@/lib/tour-picker'
import { payloadSdk } from '@/payload-sdk'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Timeline,
  TimelineItem,
  type TimelineItemProps,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { ArrowDown, ArrowUp, GripVertical, Lock, PenLine, Search, Trash2 } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSave } from '../saving'

/** Content a tour may include (see `getTourEditorData`). */
export type TourCandidate = {
  id: string
  title: string
  objectName: string
  price: number
  locked: boolean
}

type TourValues = { title: string; description: string; contents: string[] }

/**
 * One draggable stop of the tour timeline. Mantine's Timeline passes its
 * layout props (active state, line, alignment) to its direct children, so
 * this wrapper forwards every received prop to `TimelineItem` and binds the
 * sortable element there, keeping the timeline intact.
 *
 * Reordering: drag by the grip handle (not the whole card, so scrolling on
 * touch never starts a drag; dnd-kit auto-scrolls long tours and supports
 * keyboard sorting), or the up/down buttons — a one-tap alternative that is
 * more precise on long tours and keeps reordering possible without dragging
 * (WCAG 2.5.7).
 */
function SortableStop({
  id,
  index,
  content,
  lockedLabel,
  first,
  last,
  onMove,
  onRemove,
  ...timelineProps
}: Omit<TimelineItemProps, 'content'> & {
  id: string
  index: number
  content: TourCandidate
  lockedLabel: string | null
  first: boolean
  last: boolean
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('editing')
  const { ref, handleRef, isDragging } = useSortable({ id, index })
  return (
    <TimelineItem ref={ref} {...timelineProps} style={{ opacity: isDragging ? 0.6 : 1 }}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Stack gap={2} miw={0}>
          <Text size="xs" c="dimmed" truncate>
            {content.objectName}
          </Text>
          {lockedLabel && (
            <Badge variant="light" color="orange" leftSection={<Lock size={12} />}>
              {lockedLabel}
            </Badge>
          )}
        </Stack>
        <Group gap={2} wrap="nowrap">
          <ActionIcon
            ref={handleRef}
            variant="subtle"
            color="gray"
            aria-label={t('Drag to reorder {{title}}', { title: content.title })}
            style={{ cursor: 'grab', touchAction: 'none' }}
          >
            <GripVertical size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            aria-label={t('Move up')}
            disabled={first}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            aria-label={t('Move down')}
            disabled={last}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={t('Remove {{title}}', { title: content.title })}
            onClick={onRemove}
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </TimelineItem>
  )
}

/**
 * Tour builder for `/tour/new` and `/tour/:id/edit`: title, short
 * description and the ordered contents (the visiting order). Contents come
 * from the museum's exhibited objects; locked (paid, not owned) ones are
 * flagged so the author can swap them — the purchase modal links here.
 * Customizing someone else's tour creates a new tour owned by the visitor.
 *
 * Adding stops: the quick select for a known title, or "Browse contents" /
 * "Write a new content", which leave for the contents search in picker mode
 * (`src/lib/tour-picker.ts`) and come back with `?draft=1&add=<id>`. The
 * unsaved draft lives in sessionStorage meanwhile, so nothing typed is lost.
 */
export function TourForm({
  tourId,
  museum,
  candidates,
  initial,
}: {
  /** Existing tour being edited; absent for a new tour (incl. customized copies). */
  tourId?: string
  museum: { id: string; name: string }
  candidates: TourCandidate[]
  initial?: Partial<TourValues>
}) {
  const { t } = useTranslation('editing')
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // This editor's own URL (museum/from query kept, round-trip params dropped):
  // where the picker returns, and the draft's storage key.
  const editorQuery = new URLSearchParams(searchParams.toString())
  editorQuery.delete(DRAFT_PARAM)
  editorQuery.delete(ADD_PARAM)
  const editorUrl = editorQuery.size ? `${pathname}?${editorQuery}` : pathname
  const draftKey = `tour-draft:${editorUrl}`
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const form = useForm<TourValues>({
    initialValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      // Contents no longer exhibited by the museum can't be shown or reordered.
      contents: (initial?.contents ?? []).filter((id) => byId.has(id)),
    },
    validate: {
      title: (value) => (value.trim() ? null : t('Required')),
      contents: (value) => (value.length ? null : t('Add at least one content')),
    },
  })
  const selected = form.values.contents

  // Back from the picker: restore the draft, append the picked content, then
  // drop the round-trip params so a reload doesn't add it again.
  // Once per arrival: the save effect below overwrites storage right after
  // this reads it, so a second run (React's dev double-invoke) must not
  // restore again.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || searchParams.get(DRAFT_PARAM) !== '1') return
    restored.current = true
    let draft: TourValues | null = null
    try {
      const stored = sessionStorage.getItem(draftKey)
      draft = stored ? (JSON.parse(stored) as TourValues) : null
    } catch {
      // Storage blocked (private mode): start from the saved tour instead.
    }
    const base = draft ?? form.getValues()
    const added = searchParams.get(ADD_PARAM)
    const contents = base.contents.filter((id) => byId.has(id))
    if (added && byId.has(added) && !contents.includes(added)) contents.push(added)
    form.setValues({ ...base, contents })
    router.replace(editorUrl as Route, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the draft while the author browses or writes contents elsewhere.
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(form.values))
    } catch {
      // Storage blocked: the round trip then keeps only the picked stop.
    }
  }, [draftKey, form.values])
  const clearDraft = () => {
    try {
      sessionStorage.removeItem(draftKey)
    } catch {}
  }

  const picker = { museumId: museum.id, returnTo: editorUrl, have: selected }
  const lockedSelected = selected.filter((id) => byId.get(id)?.locked)

  const save = useSave(
    (values: TourValues) => {
      const data = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        contents: values.contents,
        museum: museum.id,
      }
      return tourId
        ? payloadSdk.update({ collection: 'tours', id: tourId, data })
        : payloadSdk.create({ collection: 'tours', data })
    },
    (saved) => {
      clearDraft()
      router.push(`/${lng}/tour/${saved.id}` as Route)
    },
  )

  const move = (index: number, delta: number) => {
    const next = [...selected]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item!)
    form.setFieldValue('contents', next)
  }

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        <Title order={2}>{tourId ? t('Edit tour') : t('New tour')}</Title>
        <Text c="dimmed" size="sm">
          {t('Museum: {{name}}', { name: museum.name })}
        </Text>
        <TextInput label={t('Title')} required {...form.getInputProps('title')} />
        <TextInput
          label={t('Short description')}
          maxLength={70}
          {...form.getInputProps('description')}
        />

        <Stack gap="xs">
          <Text fw={600}>{t('Stops, in visiting order')}</Text>
          {lockedSelected.length > 0 && (
            <Alert color="orange" icon={<Lock size={16} />}>
              {t(
                '{{count}} stops are paid contents you do not own. Replace them to keep the tour free.',
                {
                  count: lockedSelected.length,
                },
              )}
            </Alert>
          )}
          <DragDropProvider
            onDragEnd={(event) => {
              // dnd-kit reorders the DOM optimistically while dragging; commit
              // the move to form state once the drop is final.
              const { source } = event.operation
              if (event.canceled || !isSortable(source)) return
              move(source.initialIndex, source.index - source.initialIndex)
            }}
          >
            <Timeline bulletSize={28} lineWidth={2} active={selected.length - 1}>
              {selected.map((id, index) => {
                const content = byId.get(id)!
                return (
                  <SortableStop
                    key={id}
                    id={id}
                    index={index}
                    bullet={<Text size="xs">{index + 1}</Text>}
                    title={content.title}
                    content={content}
                    lockedLabel={content.locked ? formatPrice(content.price, lng) : null}
                    first={index === 0}
                    last={index === selected.length - 1}
                    onMove={(delta) => move(index, delta)}
                    onRemove={() =>
                      form.setFieldValue(
                        'contents',
                        selected.filter((other) => other !== id),
                      )
                    }
                  />
                )
              })}
            </Timeline>
          </DragDropProvider>
          <Select
            label={t('Add a stop')}
            placeholder={t('Search the museum’s contents')}
            searchable
            value={null}
            data={candidates
              .filter((candidate) => !selected.includes(candidate.id))
              .map((candidate) => ({
                value: candidate.id,
                label: `${candidate.title} — ${candidate.objectName}${
                  candidate.locked ? ` (${formatPrice(candidate.price, lng)})` : ''
                }`,
              }))}
            onChange={(id) => id && form.setFieldValue('contents', [...selected, id])}
            nothingFoundMessage={t('No contents available in this museum')}
            error={form.errors.contents}
          />
          <Group gap="xs">
            <Button
              component={Link}
              href={tourPickerHref(lng, picker) as Route}
              variant="light"
              leftSection={<Search size={16} aria-hidden />}
            >
              {t('Browse contents')}
            </Button>
            <Button
              component={Link}
              href={newStopHref(lng, picker) as Route}
              variant="light"
              color="teal"
              autoContrast
              leftSection={<PenLine size={16} aria-hidden />}
            >
              {t('Write a new content')}
            </Button>
          </Group>
        </Stack>

        <Group justify="end">
          <Button
            variant="default"
            onClick={() => {
              clearDraft()
              router.back()
            }}
            disabled={save.isPending}
          >
            {t('Cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {tourId ? t('Save') : t('Create tour')}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
