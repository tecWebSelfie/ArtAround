'use client'

import { VISIT_MINUTES } from '@/lib/tour-plan'
import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import { VisitPlaceSearch } from './VisitPlaceSearch'
import {
  Alert,
  Button,
  Checkbox,
  Container,
  Group,
  Slider,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { Accessibility, ArrowRight, CircleAlert, Clock, MapPin, PenLine, Users } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PlanPreview } from './PlanPreview'
import { usePlanVisit } from './use-plan-visit'
import { MoreAboutVisit } from './MoreAboutVisit'
import { PlanVisitDictationButton } from './PlanVisitDictationButton'
import { useDictation, type Museum, PLAN_PAGE_CLASS } from './plan-visit-state'

/**
 * The "Plan my visit" form and its preview. Only form controls: the visitor
 * never writes a prompt (interests are an ordinary field, typed or dictated).
 *
 * Flow and invariants:
 * - The plan reads as numbered steps (DESIGN.md → Plan my visit): where the
 *   visitor is (nearest museums first), what interests them, then the visit's
 *   frame in a "Your visit" panel — time, step-free route, the optional
 *   "More about your visit" — ending in the "All set?" action. In museum mode
 *   the museum is fixed, its step is gone and the intro names the museum.
 * - Below the desktop breakpoint the same steps stack in one column, in the
 *   same order, and the fieldset holds the submit because its inert window
 *   (planning) is exactly the fieldset's disabled one.
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

export function PlanVisitPage({
  museums,
  lockedMuseum,
}: {
  museums: Museum[]
  /** Museum mode: the museum is fixed, its field hidden and its name in the intro. */
  lockedMuseum: string | null
}) {
  const { t } = useTranslation('plan-visit')
  const {
    answers,
    update,
    setChildren,
    setAge,
    ageError,
    moreOpen,
    setMoreOpen,
    planning,
    error,
    dictation,
    chosenName,
    ages,
    reader,
    readingQuery,
    plan,
    showPreview,
    previewHeading,
    change,
    start,
    submit,
  } = usePlanVisit(museums, lockedMuseum)

  if (showPreview && plan) {
    return (
      <PlanPreview
        plan={plan}
        headingRef={previewHeading}
        wheelchair={answers.wheelchair}
        ages={ages}
        reader={reader}
        onReaderChange={(value) => update('reader', value)}
        onChange={change}
        onStart={start}
        navigationQuery={readingQuery.toString()}
      />
    )
  }

  return (
    <main className={PLAN_PAGE_CLASS}>
      {/* Wide screens get the accepted two-column steps layout (below md the
          grid keeps one column in the same order), so the container widens. */}
      <Container size="xs" py="xl" className="from-md:max-w-[72rem]">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Stack gap="lg">
            <BackToNavigator />
            {/* The masthead owns its measure: title, then the intro. */}
            <Stack gap="sm">
              <Title order={1}>{t('Plan my visit')}</Title>
              <Text c="dimmed" className="from-md:max-w-[75ch]">
                {lockedMuseum && chosenName
                  ? t('Tell us about your visit to {{museum}} and we will choose the stops.', {
                      museum: chosenName,
                    })
                  : t('Tell us where you are and what interests you: we will choose the stops.')}
              </Text>
            </Stack>
            {/* Disabled while planning: the answers being planned can't change
                under it. The submit lives inside because its inert window is
                exactly the fieldset's: while planning both are inert, and the
                loading state still names the button. */}
            <fieldset disabled={planning} className="m-0 min-w-0 border-0 p-0">
              {/* The visitor's own words lead in the composer column; the
                  visit's frame and the action follow in the panel. Below md
                  it is one column in the same order. */}
              <div className="grid gap-(--mantine-spacing-lg) from-md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                <Stack gap="lg">
                  {!lockedMuseum && (
                    <PlanStep
                      n="01"
                      id="plan-where"
                      icon={<MapPin size={16} aria-hidden />}
                      title={t('Where are you?')}
                    >
                      <VisitPlaceSearch
                        museums={museums}
                        value={answers.museumId}
                        onChange={(value) => update('museumId', value)}
                        labelledBy="plan-where"
                      />
                    </PlanStep>
                  )}
                  <PlanStep
                    n={lockedMuseum ? '01' : '02'}
                    id="plan-interests"
                    icon={<PenLine size={16} aria-hidden />}
                    title={t('Interests')}
                    final
                  >
                    <InterestsField
                      value={answers.interests}
                      onChange={(value) => update('interests', value)}
                      dictation={dictation}
                    />
                  </PlanStep>
                </Stack>
                {/* The visit's frame reads back as one panel: what most
                    visits need, the optional family, and the action. */}
                <YourVisitPanel
                  answers={answers}
                  update={update}
                  setChildren={setChildren}
                  setAge={setAge}
                  ageError={ageError}
                  moreOpen={moreOpen}
                  setMoreOpen={setMoreOpen}
                  planning={planning}
                  chosenName={chosenName}
                  error={error}
                  lockedMuseum={lockedMuseum}
                />
              </div>
            </fieldset>
          </Stack>
        </form>
      </Container>
    </main>
  )
}

/** The "Your visit" panel keeps frame, recovery, and action in one stack. */
function YourVisitPanel({
  answers,
  update,
  setChildren,
  setAge,
  ageError,
  moreOpen,
  setMoreOpen,
  planning,
  chosenName,
  error,
  lockedMuseum,
}: Pick<
  ReturnType<typeof usePlanVisit>,
  | 'answers'
  | 'update'
  | 'setChildren'
  | 'setAge'
  | 'ageError'
  | 'moreOpen'
  | 'setMoreOpen'
  | 'planning'
  | 'chosenName'
  | 'error'
> & { lockedMuseum: string | null }) {
  const { t } = useTranslation('plan-visit')
  return (
    <Stack gap="lg" className="plan-visit-panel">
      <Text fw={600}>{t('Your visit')}</Text>
      <PlanStep
        n={lockedMuseum ? '02' : '03'}
        id="plan-time"
        icon={<Clock size={16} aria-hidden />}
        title={t('How much time do you have?')}
      >
        <VisitTimeField value={answers.minutes} onChange={(value) => update('minutes', value)} />
      </PlanStep>
      <PlanStep
        n={lockedMuseum ? '03' : '04'}
        id="plan-route"
        icon={<Accessibility size={16} aria-hidden />}
        title={t('Wheelchair-accessible route')}
      >
        <Checkbox
          size="md"
          aria-labelledby="plan-route"
          description={t('Directions avoid stairs and steps. The stops stay the same.')}
          checked={answers.wheelchair}
          onChange={(event) => update('wheelchair', event.currentTarget.checked)}
        />
      </PlanStep>
      <PlanStep
        n={lockedMuseum ? '04' : '05'}
        id="plan-who"
        icon={<Users size={16} aria-hidden />}
        title={t('Who is coming?')}
        final
      >
        <MoreAboutVisit
          answers={answers}
          update={update}
          setChildren={setChildren}
          setAge={setAge}
          ageError={ageError}
          open={moreOpen}
          onToggle={() => setMoreOpen((open) => !open)}
        />
      </PlanStep>
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
      <div className="plan-visit-panel-cta">
        <Text fw={600}>{t('All set?')}</Text>
        <PlanSubmit planning={planning} chosenName={chosenName} />
      </div>
    </Stack>
  )
}

/**
 * One numbered step of the plan: the marker column, the connector to the
 * next step (every step except the last of its column draws it), and the
 * icon + title row that names what the step asks.
 */
function PlanStep({
  n,
  id,
  icon,
  title,
  final = false,
  children,
}: {
  n: string
  id: string
  icon: ReactNode
  title: string
  final?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={`plan-visit-step${final ? ' plan-visit-step-final' : ''}`}
    >
      <span className="plan-visit-step-n tabular-nums" aria-hidden>
        {n}
      </span>
      <div className="plan-visit-step-copy">
        <div className="plan-visit-step-title" id={id}>
          {icon}
          {title}
        </div>
        {children}
      </div>
    </section>
  )
}

/**
 * The planning action and its spoken status: readable in both global and
 * museum mode, and saying what the wait is doing (the form is disabled
 * meanwhile, so the line is the only thing that moves).
 */
function PlanSubmit({ planning, chosenName }: { planning: boolean; chosenName: string | null }) {
  const { t } = useTranslation('plan-visit')
  let status: string
  if (!planning) status = t('Usually takes a few seconds.')
  else if (chosenName) status = t('Choosing the stops at {{museum}}…', { museum: chosenName })
  else status = t('Finding the museum and choosing the stops…')
  return (
    <Stack gap="xs">
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={planning}
        color="museum.8"
        autoContrast
        rightSection={<ArrowRight size={18} aria-hidden />}
      >
        {t('Plan my visit')}
      </Button>
      <Text size="sm" c="dimmed" ta="center" role="status">
        {status}
      </Text>
    </Stack>
  )
}

/** The interests' length limit, also the planner API's. */
const INTERESTS_MAX = 500

/**
 * The interests, typed or dictated: the page's hero field (DESIGN.md → Plan
 * my visit), an autosizing textarea in the assistant-ember halo
 * (`.plan-visit-interest` in globals.css) with its character count and the
 * dictation pill inside its lower edge. Dictated words land in the field for
 * editing; the browser's interim words show as a quiet preview, and a polite
 * status line announces recording, transcribing and the words added. The
 * example chips insert their text at the caret.
 */
function InterestsField({
  value,
  onChange,
  dictation,
}: {
  value: string
  onChange: (value: string) => void
  dictation: ReturnType<typeof useDictation>
}) {
  const { t } = useTranslation('plan-visit')
  const field = useRef<HTMLTextAreaElement>(null)
  const dictationStatus = {
    idle: dictation.completed ? t('Dictation added to your interests.') : null,
    recording: t('Listening… Tap the button to stop.'),
    transcribing: t('Writing down your words…'),
  }[dictation.state]
  const dictationError =
    dictation.error &&
    {
      microphone: t('The microphone is not available. You can type instead.'),
      transcription: t('Dictation did not work. Try again, or type instead.'),
    }[dictation.error]

  // Replaces the selection (or inserts at the caret), spaced from its
  // neighbours and cut to the field's limit, then puts the caret after it.
  const insert = (suggestion: string) => {
    const start = field.current?.selectionStart ?? value.length
    const end = field.current?.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const after = value.slice(end)
    const spaced = `${before && !/\s$/.test(before) ? ' ' : ''}${suggestion}${after && !/^\s/.test(after) ? ' ' : ''}`
    const inserted = spaced.slice(0, Math.max(INTERESTS_MAX - before.length - after.length, 0))
    onChange(`${before}${inserted}${after}`)
    requestAnimationFrame(() => {
      const caret = before.length + inserted.length
      field.current?.focus()
      field.current?.setSelectionRange(caret, caret)
    })
  }

  return (
    <Stack gap="sm">
      {/* The step's title (PlanStep, id plan-interests) labels the field; this
          help line stays outside the halo, which frames the field alone. */}
      <Text size="sm" c="dimmed" id="plan-interests-help">
        {t(
          'A topic, an artist, a period, or nothing at all. For example: a thesis on Parmigianino.',
        )}
      </Text>
      <div className="plan-visit-interest" data-state={dictation.state}>
        <Textarea
          ref={field}
          size="lg"
          aria-labelledby="plan-interests"
          aria-describedby="plan-interests-help"
          autosize
          minRows={5}
          maxRows={10}
          maxLength={INTERESTS_MAX}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          error={dictationError}
          bottomSection={
            <Stack gap="xs" className="plan-visit-hero-bottom">
              {/* Visual only: the status line below announces the dictation. */}
              {dictation.interimText && (
                <Text size="sm" className="plan-visit-interim" aria-hidden>
                  {dictation.interimText}
                </Text>
              )}
              <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                <Text size="xs" c="dimmed" className="tabular-nums">
                  {value.length}/{INTERESTS_MAX}
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
      <Text size="sm" c="dimmed" role="status">
        {dictationStatus}
      </Text>
      {/* The chips say what they do before the visitor has to guess. */}
      <div>
        <p className="plan-visit-chips-label">{t('Need a starting point? Tap an example:')}</p>
        <Group gap="xs">
          {[
            t('Must-see masterpieces'),
            t('Caravaggio and the 17th century'),
            t('A visit with children'),
          ].map((suggestion) => (
            <UnstyledButton
              key={suggestion}
              type="button"
              className="plan-visit-interest-chip"
              onClick={() => insert(suggestion)}
            >
              {suggestion}
            </UnstyledButton>
          ))}
        </Group>
      </div>
    </Stack>
  )
}

/** How long the visit can take: an exact number of minutes (15–240, step 5);
    the historical choices stay as marks on the track. */
function VisitTimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation('plan-visit')
  // Readable time: '30 min' / '1 h' / '1 h 30' (keys in plan-visit.json).
  const format = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    if (hours === 0) return t('{{count}} min', { count: rest })
    if (rest === 0) return t('{{count}} h', { count: hours })
    return t('{{hours}} h {{minutes}} min', { hours, minutes: rest })
  }
  const minutes =
    value !== '' && Number.isFinite(Number(value)) ? Math.min(240, Math.max(15, Number(value))) : 60
  return (
    <Stack gap="md">
      <p className="plan-visit-time-readout tabular-nums">{format(minutes)}</p>
      <Slider
        size="md"
        mb="sm"
        min={15}
        max={240}
        step={5}
        value={minutes}
        onChange={(n) => onChange(String(n))}
        marks={VISIT_MINUTES.map((mark) => ({ value: mark, label: format(mark) }))}
        label={format}
        thumbLabel={t('How much time do you have?')}
        thumbValueText={format}
      />
      <Text size="sm" c="dimmed">
        {t('Drag to the exact time you have - 15 minutes to 4 hours.')}
      </Text>
    </Stack>
  )
}
