'use client'

import { VISIT_MINUTES, type PlannedTour, type PlanRequest } from '@/lib/tour-plan'
import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import { createSessionStore } from '@/lib/session-store'
import { tourNavigationPath } from '@/lib/tour-navigation'
import { readerFor, setReadingProfile } from '@/lib/reading-profile'
import { ReadingProfile } from '@/components/group/ReadingProfile'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { ACCESSIBILITY_COLOR, TOUR_GRADIENT } from '@/theme'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Container,
  Group,
  Input,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Timeline,
  Title,
  UnstyledButton,
} from '@mantine/core'
import {
  Accessibility,
  Baby,
  ChevronDown,
  CircleAlert,
  Clock,
  Footprints,
  MapPin,
  MapPinCheck,
  Mic,
  Play,
  Square,
} from 'lucide-react'
import type { Route } from 'next'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The "Plan my visit" form and its preview. Only form controls: the visitor
 * never writes a prompt (interests are an ordinary field, typed or dictated).
 *
 * Flow and invariants:
 * - The form shows what most visits need (museum unless locked, time,
 *   interests, step-free route); first/returning visit and the group sit in a
 *   "More about your visit" section whose toggle summarizes their values, so
 *   nothing is hidden without being visible at a glance.
 * - Nothing the visitor types is dropped silently: numbers are constrained by
 *   their inputs, and a missing child's age is an inline error on submit.
 * - Submitting asks `/api/plan-tour` for a tour (it may take a few seconds:
 *   one or two model calls), with the form disabled and a spoken status line.
 * - The preview is a URL state, `?tour={id}`, pushed onto the history: the
 *   browser's Back returns to the answers, and a reload restores the preview
 *   from sessionStorage. Opened elsewhere (a shared link, another device) the
 *   same URL goes to the saved tour's own page, since the tour is saved anyway.
 * - "Start the visit" opens tour navigation with the step-free route and the
 *   children's versions the answers asked for.
 */

/** `label` is "Name, City" for the Select; `name` alone names it in copy. */
type Museum = { value: string; label: string; name: string }

/** The form's answers, as kept in state and in sessionStorage. */
type Answers = {
  museumId: string | null
  minutes: string
  returning: 'first' | 'returning'
  adults: number
  /** One entry per child; '' until its age is entered. */
  childrenAges: (number | '')[]
  interests: string
  wheelchair: boolean
  /** Personal reader, not a constraint shared by the whole family's plan. */
  reader: string
}

const DEFAULT_ANSWERS: Answers = {
  museumId: null,
  minutes: '60',
  returning: 'first',
  adults: 1,
  childrenAges: [],
  interests: '',
  wheelchair: false,
  reader: 'adult',
}

/**
 * The answers and the last plan of this tab, in sessionStorage
 * (`src/lib/session-store.ts`): they survive a reload or a trip to the map and
 * back. The store is the only copy, so there is no state to sync with it.
 */
const STORAGE_KEY = 'aa-plan-visit'
type Stored = { answers: Answers; plan: PlannedTour | null }
const store = createSessionStore<Stored>((stored) => {
  const parsed = stored as Partial<Stored> | null
  return { answers: { ...DEFAULT_ANSWERS, ...parsed?.answers }, plan: parsed?.plan ?? null }
})
const EMPTY: Stored = { answers: DEFAULT_ANSWERS, plan: null }

const MAX_CHILDREN = 10

/** Props of every count field: whole numbers in range, a numeric keypad, no steppers. */
const COUNT_INPUT = {
  size: 'md',
  allowDecimal: false,
  allowNegative: false,
  clampBehavior: 'strict',
  hideControls: true,
  inputMode: 'numeric',
} as const

type DictationState = 'idle' | 'recording' | 'transcribing'
type DictationError = 'microphone' | 'transcription' | null

/** Tap to record, tap again to stop; the words land in the field for editing. */
function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<DictationState>('idle')
  const [error, setError] = useState<DictationError>(null)
  const recorder = useRef<MediaRecorder | null>(null)

  const toggle = async () => {
    if (state === 'recording') return recorder.current?.stop()
    if (state !== 'idle') return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const media = new MediaRecorder(stream)
      media.ondataavailable = (event) => chunks.push(event.data)
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        setState('transcribing')
        try {
          const form = new FormData()
          form.append('audio', new Blob(chunks, { type: media.mimeType }), 'interests.webm')
          const response = await fetch('/api/transcribe', { method: 'POST', body: form })
          if (!response.ok) throw new Error('transcription')
          const { text } = (await response.json()) as { text?: string }
          if (text) onText(text)
        } catch {
          setError('transcription')
        } finally {
          setState('idle')
        }
      }
      recorder.current = media
      media.start()
      setState('recording')
    } catch {
      // Permission denied, no microphone, or no MediaRecorder: typing still works.
      setError('microphone')
      setState('idle')
    }
  }
  return { state, error, toggle }
}

export function PlanVisitPage({
  museums,
  lockedMuseum,
}: {
  museums: Museum[]
  /** Museum mode: the museum is fixed, its field hidden and its name in the intro. */
  lockedMuseum: string | null
}) {
  const { t } = useTranslation('plan-visit')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tourParam = searchParams.get('tour')

  // `null` until hydration: the server and the first render show the
  // defaults, and before that `?tour=` can't be judged.
  const stored = store.useValue(STORAGE_KEY)
  const restored = stored !== null
  const { plan } = stored ?? EMPTY
  // In museum mode the locked museum always wins over a stored choice.
  const answers: Answers = {
    ...(stored ?? EMPTY).answers,
    museumId: lockedMuseum ?? (stored ?? EMPTY).answers.museumId,
  }
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ageError, setAgeError] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // Whether this page pushed the `?tour=` entry, so "Change" can pop it.
  const pushedPreview = useRef(false)
  const previewHeading = useRef<HTMLHeadingElement>(null)

  // Updaters read the latest stored answers, so an async one (dictation)
  // never overwrites what was typed meanwhile.
  const setAnswers = (next: (current: Answers) => Answers) => {
    const latest = store.get(STORAGE_KEY)
    store.save(STORAGE_KEY, { ...latest, answers: next(latest.answers) })
  }
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }))

  const dictation = useDictation((text) =>
    setAnswers((current) => ({
      ...current,
      interests: (current.interests ? `${current.interests} ${text}` : text).slice(0, 500),
    })),
  )

  const showPreview = Boolean(plan && tourParam && plan.id === tourParam)

  // A `?tour=` this tab didn't plan (shared link, other device): the tour is
  // saved, so its own page shows it.
  useEffect(() => {
    if (restored && tourParam && !showPreview) {
      router.replace(`/${lng}/tour/${tourParam}` as Route)
    }
  }, [restored, tourParam, showPreview, lng, router])

  // The form unmounts into the preview: move focus to its heading so
  // keyboard and screen-reader users land on the result.
  useEffect(() => {
    if (showPreview) previewHeading.current?.focus()
  }, [showPreview])

  // In museum mode `answers.museumId` is the locked museum.
  const chosenName = museums.find((m) => m.value === answers.museumId)?.name ?? null
  const ages = answers.childrenAges.filter((age): age is number => age !== '')

  const setChildren = (count: number) =>
    setAnswers((current) => ({
      ...current,
      childrenAges: Array.from({ length: count }, (_, i) => current.childrenAges[i] ?? ''),
      // Somebody has to come: without children, at least one adult.
      adults: count === 0 ? Math.max(current.adults, 1) : current.adults,
    }))

  const setAge = (index: number, age: number | '') =>
    setAnswers((current) => ({
      ...current,
      childrenAges: current.childrenAges.map((old, i) => (i === index ? age : old)),
    }))

  const submit = async () => {
    if (answers.childrenAges.some((age) => age === '')) {
      setAgeError(true)
      setMoreOpen(true)
      return
    }
    setAgeError(false)
    setPlanning(true)
    setError(null)
    const body: PlanRequest = {
      museumId: answers.museumId,
      minutes: Number(answers.minutes),
      returning: answers.returning === 'returning',
      adults: answers.adults,
      childrenAges: ages,
      interests: answers.interests,
      lng,
    }
    try {
      const response = await fetch('/api/plan-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await response.json()) as PlannedTour & { error?: string }
      if (!response.ok) {
        // Each answer of the API gets its own problem and way out.
        const messages: Record<string, string> = {
          429: t('Too many visits planned in a short time. Try again in a minute.'),
          400: t('Some answers could not be read. Check them and try again.'),
          museum: t('Choose the museum, or name it in your interests.'),
          empty: t('This museum has no free contents to visit yet.'),
          budget: t('No content fits this time. Choose a longer visit and try again.'),
        }
        setError(
          messages[response.status] ??
            messages[json.error ?? ''] ??
            t('The visit could not be planned right now. Try again in a minute.'),
        )
        return
      }
      store.save(STORAGE_KEY, { ...store.get(STORAGE_KEY), plan: json })
      // A history entry of its own: Back from the preview is "Change".
      window.history.pushState(null, '', `${pathname}?tour=${json.id}`)
      pushedPreview.current = true
    } catch {
      setError(t('No connection. Check it and try again.'))
    } finally {
      setPlanning(false)
    }
  }

  const change = () => {
    if (pushedPreview.current) {
      pushedPreview.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, '', pathname)
    }
  }

  const reader = readerFor(answers.reader, ages)
  const readingQuery = new URLSearchParams()
  if (answers.wheelchair) readingQuery.set('mobility', 'wheelchair')
  setReadingProfile(readingQuery, reader)

  const start = () => {
    if (!plan) return
    const path = tourNavigationPath(lng, plan.museumId, plan.id, 0)
    router.push((readingQuery.size ? `${path}?${readingQuery}` : path) as Route)
  }

  if (showPreview && plan) {
    return (
      <div className="text-pretty [--mantine-color-error:light-dark(var(--mantine-color-red-8),var(--mantine-color-red-4))] [&_.mantine-InputWrapper-description]:leading-normal [--mantine-color-dimmed:light-dark(var(--mantine-color-gray-7),var(--mantine-color-gray-5))]">
        <Container size="xs" py="xl">
          <Stack gap="lg">
            <BackToNavigator />
            <Stack gap="xs">
              <Title order={1} ref={previewHeading} tabIndex={-1} className="outline-none">
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
                {answers.wheelchair && (
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
            <ReadingProfile
              ages={ages}
              value={reader}
              onChange={(value) => update('reader', value)}
            />
            <Group grow>
              <Button variant="default" size="md" onClick={change}>
                {t('Change')}
              </Button>
              {/* The tour gradient: starting a tour (DESIGN.md → tour identity). */}
              <Button
                size="md"
                variant="gradient"
                gradient={TOUR_GRADIENT}
                rightSection={<Play size={16} aria-hidden />}
                onClick={start}
              >
                {t('Start the visit')}
              </Button>
            </Group>
            <StartGroupButton tourId={plan.id} navigationQuery={readingQuery.toString()} />
          </Stack>
        </Container>
      </div>
    )
  }

  const moreSummary = [
    answers.returning === 'returning' ? t('Been before') : t('First visit'),
    t('Adults: {{n}}', { n: answers.adults }),
    answers.childrenAges.length ? t('Children: {{n}}', { n: answers.childrenAges.length }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const recording = dictation.state === 'recording'
  const dictateLabel = recording ? t('Stop dictating') : t('Dictate')
  const dictationHelp = {
    idle: null,
    recording: t('Listening… Tap the square to stop.'),
    transcribing: t('Writing down your words…'),
  }[dictation.state]
  const dictationError =
    dictation.error &&
    {
      microphone: t('The microphone is not available. You can type instead.'),
      transcription: t('Dictation did not work. Try again, or type instead.'),
    }[dictation.error]

  return (
    <main className="text-pretty [--mantine-color-error:light-dark(var(--mantine-color-red-8),var(--mantine-color-red-4))] [&_.mantine-InputWrapper-description]:leading-normal [--mantine-color-dimmed:light-dark(var(--mantine-color-gray-7),var(--mantine-color-gray-5))]">
      <Container size="xs" py="xl">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Stack gap="lg">
            <BackToNavigator />
            <Stack gap="xs">
              <Title order={1}>{t('Plan my visit')}</Title>
              <Text c="dimmed">
                {lockedMuseum && chosenName
                  ? t('Tell us about your visit to {{museum}} and we will choose the stops.', {
                      museum: chosenName,
                    })
                  : t('Tell us about your visit and we will choose the stops.')}
              </Text>
            </Stack>
            {/* Disabled while planning: the answers being planned can't change under it. */}
            <fieldset disabled={planning} className="m-0 min-w-0 border-0 p-0">
              <Stack gap="lg">
                {!lockedMuseum && (
                  <Select
                    size="md"
                    label={t('Museum')}
                    description={t('Pick one from the list, or name it in your interests.')}
                    data={museums}
                    value={answers.museumId}
                    onChange={(value) => update('museumId', value)}
                    searchable
                    clearable
                  />
                )}
                <Stack gap={6}>
                  <Text size="md" fw={500} id="plan-time">
                    {t('How much time do you have?')}
                  </Text>
                  <SegmentedControl
                    size="md"
                    aria-labelledby="plan-time"
                    value={answers.minutes}
                    onChange={(value) => update('minutes', value)}
                    data={VISIT_MINUTES.map((value) => ({
                      value: String(value),
                      label:
                        value < 60
                          ? t('{{count}} min', { count: value })
                          : t('{{count}} h', { count: value / 60 }),
                    }))}
                  />
                </Stack>
                <Stack gap={4}>
                  <Textarea
                    size="md"
                    label={t('Interests')}
                    description={t(
                      'A topic, an artist, a period, or nothing at all. For example: a thesis on Parmigianino.',
                    )}
                    rows={3}
                    maxLength={500}
                    value={answers.interests}
                    onChange={(event) => update('interests', event.currentTarget.value)}
                    error={dictationError}
                    rightSectionWidth={52}
                    rightSection={
                      <ActionIcon
                        size="xl"
                        variant={recording ? 'filled' : 'subtle'}
                        color={recording ? 'red' : undefined}
                        radius="xl"
                        aria-label={dictateLabel}
                        title={dictateLabel}
                        onClick={() => void dictation.toggle()}
                        disabled={dictation.state === 'transcribing'}
                      >
                        {dictation.state === 'transcribing' ? (
                          <Loader size={16} />
                        ) : recording ? (
                          <Square size={16} />
                        ) : (
                          <Mic size={20} />
                        )}
                      </ActionIcon>
                    }
                  />
                  {/* Recording and transcribing are announced, and shown under the field. */}
                  <Text size="sm" c="dimmed" aria-live="polite">
                    {dictationHelp}
                  </Text>
                </Stack>
                <Checkbox
                  size="md"
                  label={t('Wheelchair-accessible route')}
                  description={t('Directions avoid stairs and steps. The stops stay the same.')}
                  checked={answers.wheelchair}
                  onChange={(event) => update('wheelchair', event.currentTarget.checked)}
                />
                {/* The rest is optional: closed, the toggle still says what is set. */}
                <Stack gap="sm">
                  {/* Two lines (title + summary) don't fit a fixed-height Button,
                    so this is an UnstyledButton with Mantine's focus ring. */}
                  <UnstyledButton
                    aria-expanded={moreOpen}
                    aria-controls="plan-more"
                    onClick={() => setMoreOpen((open) => !open)}
                    className="rounded-(--mantine-radius-sm) border border-solid border-(--mantine-color-default-border) px-(--mantine-spacing-sm) py-(--mantine-spacing-xs) hover:bg-(--mantine-color-default-hover)"
                  >
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <span className="flex min-w-0 flex-col">
                        <Text component="span" size="md" fw={500}>
                          {t('More about your visit')}
                        </Text>
                        <Text component="span" size="sm" c="dimmed" truncate="end">
                          {moreSummary}
                        </Text>
                      </span>
                      <ChevronDown
                        size={18}
                        aria-hidden
                        className={`shrink-0 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                      />
                    </Group>
                  </UnstyledButton>
                  <Collapse expanded={moreOpen} id="plan-more">
                    <Stack gap="lg" pt="xs">
                      <Stack gap={6}>
                        <Text size="md" fw={500} id="plan-returning">
                          {t('Have you been here before?')}
                        </Text>
                        <SegmentedControl
                          size="md"
                          aria-labelledby="plan-returning"
                          aria-describedby="plan-returning-help"
                          value={answers.returning}
                          onChange={(value) => update('returning', value as Answers['returning'])}
                          data={[
                            { value: 'first', label: t('First visit') },
                            { value: 'returning', label: t('Been before') },
                          ]}
                        />
                        <Text size="sm" c="dimmed" id="plan-returning-help">
                          {t(
                            'A first visit takes in the must-sees; after that, less obvious works.',
                          )}
                        </Text>
                      </Stack>
                      <SimpleGrid cols={2} spacing="md">
                        <NumberInput
                          {...COUNT_INPUT}
                          label={t('Adults')}
                          min={answers.childrenAges.length ? 0 : 1}
                          max={30}
                          value={answers.adults}
                          onChange={(value) =>
                            update('adults', typeof value === 'number' ? value : 0)
                          }
                          onBlur={() => {
                            if (!answers.childrenAges.length && answers.adults < 1)
                              update('adults', 1)
                          }}
                        />
                        <NumberInput
                          {...COUNT_INPUT}
                          label={t('Children')}
                          min={0}
                          max={MAX_CHILDREN}
                          value={answers.childrenAges.length}
                          onChange={(value) => setChildren(typeof value === 'number' ? value : 0)}
                        />
                      </SimpleGrid>
                      {answers.childrenAges.length > 0 && (
                        <Input.Wrapper
                          labelElement="div"
                          label={t("Children's ages")}
                          description={t(
                            "Their ages choose easier contents and children's versions.",
                          )}
                          error={ageError ? t("Enter each child's age, from 0 to 17.") : undefined}
                        >
                          <SimpleGrid cols={{ base: 3, xs: 4 }} spacing="xs" mt={6}>
                            {answers.childrenAges.map((age, index) => (
                              <NumberInput
                                // Children are positional: the nth field is the nth child.
                                key={index}
                                {...COUNT_INPUT}
                                aria-label={t('Age of child {{n}}', { n: index + 1 })}
                                min={0}
                                max={17}
                                value={age}
                                error={ageError && age === ''}
                                onChange={(value) =>
                                  setAge(index, typeof value === 'number' ? value : '')
                                }
                              />
                            ))}
                          </SimpleGrid>
                        </Input.Wrapper>
                      )}
                    </Stack>
                  </Collapse>
                </Stack>
              </Stack>
            </fieldset>
            {error && (
              <Alert color="red" variant="light" icon={<CircleAlert size={18} aria-hidden />}>
                {error}
              </Alert>
            )}
            <Stack gap="xs">
              {/* Readable primary action in both global and museum mode. */}
              <Button
                type="submit"
                size="md"
                fullWidth
                loading={planning}
                color="museum.8"
                autoContrast
              >
                {t('Plan my visit')}
              </Button>
              {/* The wait can take a few seconds: say what is happening. */}
              <Text size="sm" c="dimmed" ta="center" role="status">
                {planning
                  ? chosenName
                    ? t('Choosing the stops at {{museum}}…', { museum: chosenName })
                    : t('Finding the museum and choosing the stops…')
                  : null}
              </Text>
            </Stack>
          </Stack>
        </form>
      </Container>
    </main>
  )
}
