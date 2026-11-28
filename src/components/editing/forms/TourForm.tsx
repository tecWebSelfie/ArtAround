'use client'

import { formatPrice } from '@/lib/price'
import { ADD_PARAM, DRAFT_PARAM, newStopHref, tourPickerHref } from '@/lib/tour-picker'
// Not `tour-navigation`: that one pulls Pascal's map code into the editor.
import { tourStartPath } from '@/lib/tour-routes'
import { payloadSdk } from '@/payload-sdk'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Timeline,
  TimelineItem,
  type TimelineItemProps,
  Title,
} from '@mantine/core'
import { useForm, type UseFormReturnType } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Lock,
  MapPinOff,
  PenLine,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { minStopsFor } from '@/lib/tour-stops'
import { WALK_MINUTES_PER_STOP } from '@/lib/tour-plan'
import { useTranslation } from 'react-i18next'
import { StartEntranceItem, type EntranceChoice } from './StartEntranceItem'
import { useSave } from '../saving'
import { CoverImageInput, saveCover, type CoverChange, type CurrentImage } from '../CoverImageInput'
import { VisibilityInput } from '../VisibilityInput'
import {
  QuizEditor,
  saveQuizQuestions,
  validateQuiz,
  type KeptQuestion,
  type QuizDraft,
} from './QuizEditor'

/** Content a tour may include (see `getTourEditorData`). */
export type TourCandidate = {
  id: string
  title: string
  objectName: string
  price: number
  locked: boolean
  /** Reading time in whole minutes (`toMinutes`); absent for a stop no longer readable. */
  minutes?: number
  /** One of the tour's stops that can no longer be visited (`getUnavailableStops`). */
  unavailable?: boolean
}

type TourValues = {
  title: string
  description: string
  contents: string[]
  /** Private: a class visit (src/lib/visibility.ts). */
  visibility: 'public' | 'private'
  /** The visit's practical information (src/lib/tour-logistics.ts). */
  logistics: string
  /**
   * The entrance the tour starts from (an entrance marker's node id), or ''
   * for the one nearest the first stop (src/lib/tour-entrance.ts).
   */
  startEntrance: string
  /** Per stop (content id): how to reach it from the previous one. */
  directions: Record<string, string>
  /** The tour's own quiz questions (`QuizEditor`). */
  quiz: QuizDraft[]
}

/**
 * The start entrance the form opens with: only one of the choices offered.
 * An entrance staff have since removed, or the only one (the automatic pick
 * anyway, and one the author can't change), reads and saves as automatic, so
 * the form never keeps an id the author can't see or change.
 */
function initialStartEntrance(entrances: EntranceChoice[], saved?: string | null): string {
  if (!saved || entrances.length < 2) return ''
  return entrances.some((entrance) => entrance.id === saved) ? saved : ''
}

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
  directions,
  onDirectionsChange,
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
  /**
   * How to reach this stop: a logistic direction, not part of the content.
   * Null hides the field (anonymous customization keeps the original's notes).
   */
  directions: string | null
  onDirectionsChange: (value: string) => void
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
          {content.unavailable && (
            // Icon + label + color (Triplet Rule): the stop stays, flagged.
            <Group gap={4} wrap="nowrap" c="dimmed">
              <MapPinOff size={12} aria-hidden />
              <Text size="xs" fw={500}>
                {t("Visitors don't see this stop: replace or remove it")}
              </Text>
            </Group>
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
      {directions !== null && (
        <Textarea
          mt="xs"
          size="xs"
          rows={2}
          maxLength={500}
          label={
            first
              ? t('How to get here from the entrance')
              : t('How to get here from the previous stop')
          }
          placeholder={t('For example, continue left of the stairs towards room 12')}
          value={directions}
          onChange={(event) => onDirectionsChange(event.currentTarget.value)}
        />
      )}
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
 *
 * `anonymous`: a visitor who is not signed in customizing a tour (always a
 * visit copy). Only the stops, their order and the start entrance can
 * change; the title, texts, cover and quiz stay the original's, and the
 * copy is saved by `/api/tour-copy`, which checks the same rules again.
 */
export function TourForm({
  tourId,
  museum,
  candidates,
  initial,
  thumbnail,
  visitCopyOf = null,
  minStops = minStopsFor({ visitCopyOf }),
  cancelHref,
  keptQuestions = [],
  anonymous = false,
  navigation = '',
}: {
  /** Existing tour being edited; absent for a new tour (incl. customized copies). */
  tourId?: string
  /** With its placed entrances, among which the tour's start entrance is chosen. */
  museum: { id: string; name: string; entrances: EntranceChoice[] }
  candidates: TourCandidate[]
  initial?: Partial<TourValues>
  /**
   * The stored cover: the tour's own when editing, the original's when
   * customizing a copy (the copy keeps it unless the author changes it).
   */
  thumbnail?: CurrentImage | null
  /**
   * Creating or editing a visit copy (`tours.visitCopyOf`): a notice, no
   * visibility choice, and the copy's start page once saved.
   */
  visitCopyOf?: string | null
  /**
   * The stops this tour needs (`minStopsFor`, the rule the collection
   * validates): the edit page passes the stored tour's; a new tour needs
   * two unless it is a visit copy.
   */
  minStops?: number
  /**
   * Where Cancel leaves: the edited or copied tour's page, else the
   * museum's — the same parent the page's BackButton above names. Cancel
   * pushes there (never `router.back()`: the tab's history may start
   * outside the app on a shared link, and back could also land on the
   * contents picker instead of the tour) and drops the draft first, so
   * the abandoned editor leaves no trail behind.
   */
  cancelHref: Route
  /**
   * Quiz questions linked to contents (written in the admin): the editor
   * doesn't show them, the save keeps them in their places while one of
   * their contents is still a stop.
   */
  keptQuestions?: KeptQuestion[]
  /** Not signed in: stops-only customization, saved by `/api/tour-copy`. */
  anonymous?: boolean
  /**
   * Validated navigation choices (step-free route, reading profile; a query
   * without `?`) the visit copy's start page carries on to the tour.
   */
  navigation?: string
}) {
  const visitCopy = Boolean(visitCopyOf)
  const { t } = useTranslation('editing')
  let heading = t('Edit your copy')
  if (!visitCopy) heading = tourId ? t('Edit tour') : t('New tour')
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const editorUrl = useEditorUrl()
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const form = useForm<TourValues>({
    initialValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      visibility: initial?.visibility ?? 'public',
      logistics: initial?.logistics ?? '',
      startEntrance: initialStartEntrance(museum.entrances, initial?.startEntrance),
      directions: initial?.directions ?? {},
      quiz: initial?.quiz ?? [],
      // Every stop is a candidate, unvisitable ones too (flagged `unavailable`),
      // so they stay listed instead of disappearing on save.
      contents: initial?.contents ?? [],
    },
    validate: {
      title: (value) => (value.trim() ? null : t('Required')),
      contents: (value) =>
        value.length >= minStops
          ? null
          : t('A tour needs at least {{count}} stops', { count: minStops }),
      quiz: validateQuiz(
        t('Every question needs its text, the correct answer and three wrong answers'),
      ),
    },
  })

  const clearDraft = useTourDraft(form, editorUrl, (id) => byId.has(id), museum.entrances)

  // Not in the form values: a picked file can't go into the sessionStorage draft.
  const [cover, setCover] = useState<CoverChange>(null)
  const save = useSave(
    async (values: TourValues): Promise<{ id: string }> => {
      if (anonymous)
        return saveAnonymousCopy(visitCopyOf, values, (status, reason) =>
          // The route's reasons are codes for logs; the visitor reads these.
          status === 429
            ? t('Too many saves in a short time: wait a minute and try again')
            : status === 409
              ? t('You are signed in now: reload the page to save the copy to your account')
              : status === 404
                ? t('The original tour is no longer available')
                : reason === 'Invalid stops'
                  ? t('Some stops can no longer be in this tour: check them and try again')
                  : t('The copy could not be saved: try again'),
        )
      const title = values.title.trim()
      const data = {
        title,
        description: values.description.trim() || null,
        visibility: values.visibility,
        logistics: values.logistics.trim() || null,
        // Empty: the entrance nearest the first stop, worked out when navigating.
        startEntrance: values.startEntrance || null,
        // One row per stop with a note, in visiting order.
        directions: values.contents.flatMap((content) => {
          const text = values.directions[content]?.trim()
          return text ? [{ content, text }] : []
        }),
        contents: values.contents,
        museum: museum.id,
        thumbnail: await saveCover(cover, thumbnail, 'toursThumbnails', title),
      }
      // Questions first: the tour validates the ids its quiz lists.
      const quiz = await saveQuizQuestions({
        quiz: values.quiz,
        saved: initial?.quiz ?? [],
        kept: keptQuestions,
        stops: values.contents,
      })
      try {
        const withQuiz = { ...data, quiz: { questions: quiz.questions } }
        return await (tourId
          ? payloadSdk.update({ collection: 'tours', id: tourId, data: withQuiz })
          : payloadSdk.create({ collection: 'tours', data: { ...withQuiz, visitCopyOf } }))
      } catch (error) {
        // No tour lists the questions just created: don't leave them behind.
        await quiz.discard()
        throw error
      }
    },
    (saved) => {
      clearDraft()
      router.push(
        visitCopy
          ? (`${tourStartPath(lng, museum.id, saved.id)}${navigation ? `?${navigation}` : ''}` as Route)
          : (`/${lng}/tour/${saved.id}` as Route),
      )
    },
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        {/* The page's own heading: the editor is the whole page. */}
        <Title order={1} size="h2">
          {heading}
        </Title>
        <Text c="dimmed" size="sm">
          {t('Museum: {{name}}', { name: museum.name })}
        </Text>
        {visitCopy && (
          <Alert color="blue">
            <Stack gap="xs" align="start">
              <Text size="sm">
                {t(
                  'You are editing your own copy for this visit: the original tour stays as it is.',
                )}
              </Text>
              {anonymous && (
                <Text size="sm">
                  {t(
                    'Without an account you can change the stops and where the visit starts. Sign in to also change its texts and find your copy again later.',
                  )}{' '}
                  <Anchor
                    component={Link}
                    // `draft=1`: back from sign-in, the editor restores
                    // the stops changed so far (`useTourDraft`).
                    href={
                      `/${lng}/login?next=${encodeURIComponent(
                        `${editorUrl}${editorUrl.includes('?') ? '&' : '?'}${DRAFT_PARAM}=1`,
                      )}` as Route
                    }
                    inherit
                    // The primary on the light-blue alert is 3.7:1; the
                    // alert's own text color, underlined, stays a link.
                    c="inherit"
                    fw={600}
                    underline="always"
                  >
                    {t('Sign in')}
                  </Anchor>
                </Text>
              )}
            </Stack>
          </Alert>
        )}
        {/* Anonymous: the original's title and texts, shown but not editable. */}
        {anonymous ? (
          <Title order={2} size="h3">
            {form.values.title}
          </Title>
        ) : (
          <>
            <TextInput label={t('Title')} required {...form.getInputProps('title')} />
            <TextInput
              label={t('Short description')}
              maxLength={70}
              {...form.getInputProps('description')}
            />
            <CoverImageInput current={thumbnail} change={cover} onChange={setCover} />
          </>
        )}
        {/* A visit copy is always private (the server enforces it): no choice to offer. */}
        {!visitCopy && (
          <VisibilityInput
            kind="tour"
            value={form.values.visibility}
            onChange={(value) => form.setFieldValue('visibility', value)}
          />
        )}
        {/* Logistic directions: not a stop, not part of one (src/lib/tour-logistics.ts). */}
        {!anonymous && (
          <Textarea
            label={t('Practical information')}
            description={t(
              'Entrance, tickets, cloakroom: what visitors read before the first stop.',
            )}
            maxLength={1000}
            {...form.getInputProps('logistics')}
          />
        )}
        <TourStopsEditor
          form={form}
          candidates={candidates}
          byId={byId}
          museumId={museum.id}
          entrances={museum.entrances}
          returnTo={editorUrl}
          anonymous={anonymous}
        />

        {!anonymous && (
          <QuizEditor
            value={form.values.quiz}
            onChange={(quiz) => form.setFieldValue('quiz', quiz)}
            error={form.errors.quiz}
          />
        )}

        <Group justify="end">
          <Button
            variant="default"
            onClick={() => {
              // Cancel discards the draft (the BackButton above keeps it),
              // then leaves for `cancelHref`: a fixed in-app destination,
              // never a history step.
              clearDraft()
              router.push(cancelHref)
            }}
            disabled={save.isPending}
          >
            {t('Cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {/* A visit copy reads as editing (it came from "Edit"), even when it's
                created; an anonymous one says where saving takes the visitor. */}
            {anonymous
              ? t('Start with these stops')
              : tourId || visitCopy
                ? t('Save')
                : t('Create tour')}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

/**
 * An anonymous visitor's copy of `from`, saved by `/api/tour-copy`: only the
 * stops and the start entrance travel, the server takes the rest from the
 * original. A refusal throws the visitor's message for it, which `useSave` shows.
 */
async function saveAnonymousCopy(
  from: string | null,
  values: TourValues,
  /** The visitor's message for a refusal (status 0: no response at all). */
  failure: (status: number, reason?: string) => string,
) {
  const response = await fetch('/api/tour-copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      contents: values.contents,
      startEntrance: values.startEntrance || null,
    }),
  }).catch(() => null)
  if (!response) throw new Error(failure(0))
  const json = (await response.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!response.ok || !json.id) throw new Error(failure(response.status, json.error))
  return { id: json.id }
}

/**
 * This editor's own URL (museum/from query kept, round-trip params
 * dropped): where the picker returns, and the draft's storage key.
 */
function useEditorUrl() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const editorQuery = new URLSearchParams(searchParams.toString())
  editorQuery.delete(DRAFT_PARAM)
  editorQuery.delete(ADD_PARAM)
  return editorQuery.size ? `${pathname}?${editorQuery}` : pathname
}

/**
 * The unsaved draft in sessionStorage while the author browses or writes
 * contents elsewhere, restored (with the picked content appended) on the way
 * back. Returns the function that drops it once the tour is saved.
 */
function useTourDraft(
  form: UseFormReturnType<TourValues>,
  editorUrl: string,
  isCandidate: (id: string) => boolean,
  entrances: EntranceChoice[],
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftKey = `tour-draft:${editorUrl}`
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
    // A draft saved before a field existed lacks it: the current values fill it in.
    const base = { ...form.getValues(), ...draft }
    const added = searchParams.get(ADD_PARAM)
    const contents = base.contents.filter(isCandidate)
    if (added && isCandidate(added) && !contents.includes(added)) contents.push(added)
    // Like the stops, the start entrance must still be one the editor offers
    // (staff may have removed it meanwhile), or the author couldn't see it.
    const startEntrance = initialStartEntrance(entrances, base.startEntrance)
    form.setValues({ ...base, contents, startEntrance })
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
  return () => {
    try {
      sessionStorage.removeItem(draftKey)
    } catch {}
  }
}

/**
 * The stops, in visiting order: notices about paid, unvisitable or
 * unexplained stops, the timeline (the fixed start entrance, then the
 * sortable stops: drag, arrows, per-stop directions), then the ways to add
 * one: the quick select for a known title, or the contents search and the
 * content editor in picker mode.
 */
function TourStopsEditor({
  form,
  candidates,
  byId,
  museumId,
  entrances,
  returnTo,
  anonymous,
}: {
  form: UseFormReturnType<TourValues>
  candidates: TourCandidate[]
  byId: Map<string, TourCandidate>
  museumId: string
  /** The museum's placed entrances: the first, fixed item of the timeline. */
  entrances: EntranceChoice[]
  /** The editor's own URL, where the contents picker comes back. */
  returnTo: string
  /** Not signed in: no directions to write, no new content to write. */
  anonymous: boolean
}) {
  const { t } = useTranslation('editing')
  const { lng } = useParams<{ lng: string }>()
  const selected = form.values.contents
  const lockedSelected = selected.filter((id) => byId.get(id)?.locked)
  const unavailableSelected = selected.filter((id) => byId.get(id)?.unavailable)
  const missingDirections = selected.filter((id) => !form.values.directions[id]?.trim()).length
  // The planner's own count (`/api/plan-tour`): reading plus a short walk
  // per stop, so a planned visit's budget can be checked while editing.
  const minutes = selected.reduce(
    (sum, id) => sum + (byId.get(id)?.minutes ?? 0) + WALK_MINUTES_PER_STOP,
    0,
  )
  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline" gap="xs">
        <Text fw={600}>{t('Stops, in visiting order')}</Text>
        {/* Live: announced as stops are added, removed or swapped. */}
        <Text size="sm" c="dimmed" aria-live="polite">
          {t('{{count}} stops, about {{minutes}} min', { count: selected.length, minutes })}
        </Text>
      </Group>
      {lockedSelected.length > 0 && (
        <Alert color="orange" icon={<Lock size={16} />}>
          {/* Replace: "Add a stop" below; remove: this button, in one tap. */}
          <Stack gap="xs" align="start">
            <Text size="sm">
              {t(
                '{{count}} stops are paid contents you do not own. Replace them to keep the tour free.',
                {
                  count: lockedSelected.length,
                },
              )}
            </Text>
            <Button
              size="compact-sm"
              variant="default"
              onClick={() =>
                form.setFieldValue(
                  'contents',
                  selected.filter((id) => !byId.get(id)?.locked),
                )
              }
            >
              {t('Remove them from the tour', { count: lockedSelected.length })}
            </Button>
          </Stack>
        </Alert>
      )}
      {/* How much of the route is still unexplained: stops without the
          author's directions show visitors only the map's route. A quiet
          count, not a warning: directions are optional. */}
      {missingDirections > 0 && !anonymous && (
        <Text size="sm" c="dimmed">
          {t('{{count}} stops have no directions yet: visitors only see the route on the map', {
            count: missingDirections,
          })}
        </Text>
      )}
      {unavailableSelected.length > 0 && (
        <Alert color="gray" icon={<MapPinOff size={16} aria-hidden />}>
          <Stack gap="xs" align="start">
            <Text size="sm">
              {t("Visitors don't see stops that can no longer be visited: replace or remove them")}
            </Text>
            <Button
              size="compact-sm"
              variant="default"
              onClick={() =>
                form.setFieldValue(
                  'contents',
                  selected.filter((id) => !byId.get(id)?.unavailable),
                )
              }
            >
              {t('Remove them from the tour', { count: unavailableSelected.length })}
            </Button>
          </Stack>
        </Alert>
      )}
      <StopsTimeline form={form} byId={byId} entrances={entrances} withDirections={!anonymous} />
      <Select
        label={t('Add a stop')}
        placeholder={t('Search the museum’s contents')}
        searchable
        value={null}
        data={candidates
          .filter((candidate) => !candidate.unavailable && !selected.includes(candidate.id))
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
          href={tourPickerHref(lng, { museumId, returnTo, have: selected }) as Route}
          variant="light"
          leftSection={<Search size={16} aria-hidden />}
        >
          {t('Browse contents')}
        </Button>
        {/* Writing a content needs an account. */}
        {!anonymous && (
          <Button
            component={Link}
            href={newStopHref(lng, { museumId, returnTo }) as Route}
            variant="light"
            color="teal"
            autoContrast
            leftSection={<PenLine size={16} aria-hidden />}
          >
            {t('Write a new content')}
          </Button>
        )}
      </Group>
    </Stack>
  )
}

/**
 * The tour's timeline: the fixed start entrance (when the map has one), then
 * the stops, sortable among themselves (drag, arrows), each with its
 * directions.
 */
function StopsTimeline({
  form,
  byId,
  entrances,
  withDirections,
}: {
  form: UseFormReturnType<TourValues>
  byId: Map<string, TourCandidate>
  entrances: EntranceChoice[]
  /** Each stop's directions field (not in anonymous customization). */
  withDirections: boolean
}) {
  const { t } = useTranslation('editing')
  const { lng } = useParams<{ lng: string }>()
  const selected = form.values.contents
  // A removal is announced in a toast with "Undo": one tap brings the stop
  // back where it was, so a slip on the small button costs nothing.
  // One toast per removal: the same stop removed again gets its own.
  const removals = useRef(0)
  const remove = (id: string, index: number) => {
    form.setFieldValue(
      'contents',
      selected.filter((other) => other !== id),
    )
    const toast = `tour-stop-removed-${id}-${++removals.current}`
    notifications.show({
      id: toast,
      // Long enough to reach the button; hovering keeps it open.
      autoClose: 8000,
      message: (
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="sm">
            {t('Removed: {{title}}', {
              title: byId.get(id)?.title || t('A content that no longer exists'),
            })}
          </Text>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<Undo2 size={14} aria-hidden />}
            onClick={() => {
              // The stops as they are now: others may have changed meanwhile.
              const current = form.getValues().contents
              if (!current.includes(id)) {
                const next = [...current]
                next.splice(Math.min(index, next.length), 0, id)
                form.setFieldValue('contents', next)
              }
              notifications.hide(toast)
            }}
          >
            {t('Undo')}
          </Button>
        </Group>
      ),
    })
  }
  const move = (index: number, delta: number) => {
    const next = [...selected]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item!)
    form.setFieldValue('contents', next)
  }
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        // dnd-kit reorders the DOM optimistically while dragging; commit
        // the move to form state once the drop is final.
        const { source } = event.operation
        if (event.canceled || !isSortable(source)) return
        move(source.initialIndex, source.index - source.initialIndex)
      }}
    >
      {/* Every item is active: `active` at or past the last index. */}
      <Timeline bulletSize={28} lineWidth={2} active={selected.length}>
        {/* Left out here, not inside the item: Timeline counts its
            children, even one that renders nothing. */}
        {entrances.length > 0 && (
          <StartEntranceItem
            entrances={entrances}
            value={form.values.startEntrance}
            onChange={(value) => form.setFieldValue('startEntrance', value)}
          />
        )}
        {selected.map((id, index) => {
          const content = byId.get(id)!
          return (
            <SortableStop
              key={id}
              id={id}
              index={index}
              bullet={<Text size="xs">{index + 1}</Text>}
              // A deleted content has no title left to show.
              title={content.title || t('A content that no longer exists')}
              content={content}
              lockedLabel={content.locked ? formatPrice(content.price, lng) : null}
              first={index === 0}
              last={index === selected.length - 1}
              onMove={(delta) => move(index, delta)}
              directions={withDirections ? (form.values.directions[id] ?? '') : null}
              onDirectionsChange={(value) =>
                form.setFieldValue('directions', {
                  ...form.values.directions,
                  [id]: value,
                })
              }
              onRemove={() => remove(id, index)}
            />
          )
        })}
      </Timeline>
    </DragDropProvider>
  )
}
