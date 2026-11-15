'use client'

import { VISIT_MINUTES, type PlannedTour, type PlanRequest } from '@/lib/tour-plan'
import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import { createSessionStore } from '@/lib/session-store'
import { tourNavigationPath } from '@/lib/tour-navigation'
import { readerFor, setReadingProfile } from '@/lib/reading-profile'
import { ReadingProfile } from '@/components/group/ReadingProfile'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { ACCESSIBILITY_COLOR, TOUR_GRADIENT } from '@/theme'
import { PlanVisitDictationButton, type PlanVisitDictationState } from './PlanVisitDictationButton'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Container,
  Group,
  Input,
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
  Play,
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

type DictationError = 'microphone' | 'transcription' | null

type BrowserSpeechAlternative = { transcript: string }
type BrowserSpeechResult = {
  isFinal: boolean
  [index: number]: BrowserSpeechAlternative
}
type BrowserSpeechEvent = { results: ArrayLike<BrowserSpeechResult> }
type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: BrowserSpeechEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

/**
 * Uses interim browser speech when available and the existing server
 * transcription otherwise; both paths return editable text to the same field.
 */
function useDictation(onText: (text: string) => void, language: string) {
  const [state, setState] = useState<PlanVisitDictationState>('idle')
  const [error, setError] = useState<DictationError>(null)
  const [interimText, setInterimText] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [completed, setCompleted] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const recognition = useRef<BrowserSpeechRecognition | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const elapsedTimer = useRef<number | null>(null)

  const startTimer = () => {
    const startedAt = Date.now()
    setElapsedSeconds(0)
    elapsedTimer.current = window.setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    )
  }
  const stopTimer = () => {
    if (elapsedTimer.current !== null) window.clearInterval(elapsedTimer.current)
    elapsedTimer.current = null
  }

  const toggle = async () => {
    if (state === 'recording') {
      if (recognition.current) recognition.current.stop()
      else if (recorder.current?.state === 'recording') recorder.current.stop()
      return
    }
    if (state !== 'idle') return
    setError(null)
    setCompleted(false)
    setInterimText('')
    try {
      const speechWindow = window as BrowserSpeechWindow
      const SpeechRecognition =
        speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

      if (SpeechRecognition) {
        const instance = new SpeechRecognition()
        let finalTranscript = ''
        instance.lang = language
        instance.continuous = true
        instance.interimResults = true
        instance.onresult = (event) => {
          let nextFinal = ''
          let nextInterim = ''
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index]
            const transcript = result?.[0]?.transcript ?? ''
            if (result?.isFinal) nextFinal += transcript
            else nextInterim += transcript
          }
          finalTranscript = nextFinal
          setInterimText(nextInterim.trim())
        }
        instance.onerror = (event) => {
          setError(
            event.error === 'not-allowed' ||
              event.error === 'service-not-allowed' ||
              event.error === 'audio-capture'
              ? 'microphone'
              : 'transcription',
          )
        }
        instance.onend = () => {
          stopTimer()
          if (finalTranscript.trim()) {
            onText(finalTranscript.trim())
            setCompleted(true)
          }
          setInterimText('')
          setState('idle')
          recognition.current = null
        }
        recognition.current = instance
        instance.start()
        startTimer()
        setState('recording')
        return
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = mediaStream
      const chunks: Blob[] = []
      const media = new MediaRecorder(mediaStream)
      media.ondataavailable = (event) => chunks.push(event.data)
      media.onstop = async () => {
        mediaStream.getTracks().forEach((track) => track.stop())
        stream.current = null
        recorder.current = null
        stopTimer()
        setState('transcribing')
        try {
          const form = new FormData()
          form.append('audio', new Blob(chunks, { type: media.mimeType }), 'interests.webm')
          const response = await fetch('/api/transcribe', { method: 'POST', body: form })
          if (!response.ok) throw new Error('transcription')
          const { text } = (await response.json()) as { text?: string }
          if (text) {
            onText(text)
            setCompleted(true)
          }
        } catch {
          setError('transcription')
        } finally {
          setState('idle')
        }
      }
      recorder.current = media
      media.start()
      startTimer()
      setState('recording')
    } catch {
      // Permission denied, no microphone, or no MediaRecorder: typing still works.
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      recognition.current = null
      stopTimer()
      setError('microphone')
      setState('idle')
    }
  }

  useEffect(
    () => () => {
      if (elapsedTimer.current !== null) window.clearInterval(elapsedTimer.current)
      recognition.current?.abort()
      stream.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  return { state, error, interimText, elapsedSeconds, completed, toggle }
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
  const ageErrorMessage = useRef<HTMLParagraphElement>(null)

  // Updaters read the latest stored answers, so an async one (dictation)
  // never overwrites what was typed meanwhile.
  const setAnswers = (next: (current: Answers) => Answers) => {
    const latest = store.get(STORAGE_KEY)
    store.save(STORAGE_KEY, { ...latest, answers: next(latest.answers) })
  }
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }))

  const dictation = useDictation(
    (text) =>
      setAnswers((current) => ({
        ...current,
        interests: (current.interests ? `${current.interests} ${text}` : text).slice(0, 500),
      })),
    lng,
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
    // Dictation must finish before its current words can be planned.
    if (dictation.state !== 'idle') return
    const firstMissingAge = answers.childrenAges.findIndex((age) => age === '')
    if (firstMissingAge >= 0) {
      setAgeError(true)
      setMoreOpen(true)
      // Wait for the disclosure's measured height to finish expanding before
      // focusing its first invalid input; two animation frames can still be clipped.
      const focusWhenExpanded = (attempt = 0) => {
        const panel = document.getElementById('plan-more')
        if (
          panel &&
          panel.scrollHeight > 0 &&
          panel.getBoundingClientRect().height >= panel.scrollHeight - 1
        ) {
          document.getElementById(`plan-age-${firstMissingAge}`)?.focus()
          return
        }
        if (attempt < 120) {
          requestAnimationFrame(() => focusWhenExpanded(attempt + 1))
        } else {
          ageErrorMessage.current?.focus()
        }
      }
      requestAnimationFrame(() => focusWhenExpanded())
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

  const dictationHelp = {
    idle: null,
    recording: t('Listening… Tap the button to stop.'),
    transcribing: t('Writing down your words…'),
  }[dictation.state]
  const dictationMessage = dictation.completed
    ? t('Dictation added to your interests.')
    : dictationHelp
  const dictationError =
    dictation.error &&
    {
      microphone: t('The microphone is not available. You can type instead.'),
      transcription: t('Dictation did not work. Try again, or type instead.'),
    }[dictation.error]
  const showAgeError = ageError && answers.childrenAges.some((age) => age === '')

  const insertInterest = (suggestion: string) => {
    const field = document.getElementById('plan-interests') as HTMLTextAreaElement | null
    const current = answers.interests
    const start = field?.selectionStart ?? current.length
    const end = field?.selectionEnd ?? current.length
    const before = current.slice(0, start)
    const after = current.slice(end)
    const separatorBefore = before && !/\s$/.test(before) ? ' ' : ''
    const separatorAfter = after && !/^\s/.test(after) ? ' ' : ''
    const available = Math.max(500 - before.length - after.length, 0)
    const inserted = `${separatorBefore}${suggestion}${separatorAfter}`.slice(0, available)

    update('interests', `${before}${inserted}${after}`)
    requestAnimationFrame(() => {
      field?.focus()
      const caret = before.length + inserted.length
      field?.setSelectionRange(caret, caret)
    })
  }

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
                {/* The visit starts with the visitor's own words; constraints follow. */}
                <Stack gap="sm">
                  <Stack gap={4}>
                    <Text size="md" fw={600} id="plan-interests-label">
                      {t('Interests')}
                    </Text>
                    <Text size="sm" c="dimmed" id="plan-interests-help">
                      {t(
                        'A topic, an artist, a period, or nothing at all. For example: a thesis on Parmigianino.',
                      )}
                    </Text>
                  </Stack>
                  {/* Live variants replace only the hero field shell; the actual
                    form, chips and constraints remain visible as the comparison frame. */}
                  {/* Variant 1 keeps the ember edge, counter and mic pill inside the same large field. */}
                  <div className="plan-visit-interest" data-state={dictation.state}>
                    <Textarea
                      id="plan-interests"
                      size="lg"
                      autosize
                      minRows={5}
                      maxRows={10}
                      aria-labelledby="plan-interests-label"
                      aria-describedby="plan-interests-help"
                      maxLength={500}
                      value={answers.interests}
                      onChange={(event) => update('interests', event.currentTarget.value)}
                      error={dictationError}
                      bottomSection={
                        <Stack gap="xs" className="plan-visit-hero-bottom">
                          {dictation.interimText && (
                            <Text size="sm" className="plan-visit-interim" aria-hidden="true">
                              {dictation.interimText}
                            </Text>
                          )}
                          <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                            <Text size="xs" c="dimmed" className="plan-visit-character-count">
                              {answers.interests.length}/500
                            </Text>
                            <PlanVisitDictationButton
                              state={dictation.state}
                              elapsedSeconds={dictation.elapsedSeconds}
                              labels={{
                                dictate: t('Dictate'),
                                idleText: t('Dictation'),
                                stop: t('Stop dictating'),
                                transcribing: t('Writing down your words…'),
                              }}
                              onToggle={() => void dictation.toggle()}
                            />
                          </Group>
                        </Stack>
                      }
                    />
                  </div>
                  {/* Interim words are visual only; this polite line announces state changes. */}
                  <Text size="sm" c="dimmed" aria-live="polite" role="status">
                    {dictationMessage}
                  </Text>
                  <Group gap="xs" className="plan-visit-suggestions">
                    {[
                      t('Must-see masterpieces'),
                      t('Caravaggio and the 17th century'),
                      t('A visit with children'),
                    ].map((suggestion) => (
                      <UnstyledButton
                        key={suggestion}
                        type="button"
                        className="plan-visit-interest-chip"
                        onClick={() => insertInterest(suggestion)}
                      >
                        {suggestion}
                      </UnstyledButton>
                    ))}
                  </Group>
                </Stack>

                {/* Secondary constraints stay close, but cannot compete with the description. */}
                <Stack gap="md" className="plan-visit-constraints">
                  <Stack gap={6} className="plan-visit-time-control">
                    <Text size="sm" fw={500} id="plan-time">
                      {t('How much time do you have?')}
                    </Text>
                    <SegmentedControl
                      className="plan-visit-segmented"
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
                  <Checkbox
                    size="md"
                    label={t('Wheelchair-accessible route')}
                    description={t('Directions avoid stairs and steps. The stops stay the same.')}
                    checked={answers.wheelchair}
                    onChange={(event) => update('wheelchair', event.currentTarget.checked)}
                  />
                </Stack>
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
                          className="plan-visit-segmented"
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
                        >
                          <SimpleGrid cols={{ base: 3, xs: 4 }} spacing="xs" mt={6}>
                            {answers.childrenAges.map((age, index) => (
                              <NumberInput
                                // Children are positional: the nth field is the nth child.
                                key={index}
                                {...COUNT_INPUT}
                                aria-label={t('Age of child {{n}}', { n: index + 1 })}
                                aria-invalid={showAgeError && age === '' ? true : undefined}
                                aria-describedby={
                                  showAgeError && age === '' ? 'plan-age-error' : undefined
                                }
                                id={`plan-age-${index}`}
                                min={0}
                                max={17}
                                value={age}
                                error={showAgeError && age === ''}
                                onChange={(value) =>
                                  setAge(index, typeof value === 'number' ? value : '')
                                }
                              />
                            ))}
                          </SimpleGrid>
                          {showAgeError && (
                            <Text
                              ref={ageErrorMessage}
                              id="plan-age-error"
                              size="sm"
                              c="red"
                              tabIndex={-1}
                              mt="xs"
                            >
                              {t("Enter each child's age, from 0 to 17.")}
                            </Text>
                          )}
                        </Input.Wrapper>
                      )}
                    </Stack>
                  </Collapse>
                </Stack>
              </Stack>
            </fieldset>
            {/* Announce validation as soon as the disclosure opens, even while
              its height transition is still revealing the visible field error. */}
            {showAgeError && (
              <Text size="sm" role="alert" className="sr-only">
                {t("Enter each child's age, from 0 to 17.")}
              </Text>
            )}
            {error && (
              <Alert
                color="red"
                variant="light"
                icon={<CircleAlert size={18} aria-hidden />}
                role="alert"
              >
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
                  : t('Usually takes a few seconds.')}
              </Text>
            </Stack>
          </Stack>
        </form>
      </Container>
    </main>
  )
}
