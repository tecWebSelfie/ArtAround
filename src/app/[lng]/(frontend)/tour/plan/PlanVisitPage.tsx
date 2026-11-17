'use client'

import { VISIT_MINUTES } from '@/lib/tour-plan'
import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import {
  Alert,
  Button,
  Checkbox,
  Container,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { CircleAlert } from 'lucide-react'
import { useRef } from 'react'
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
 * - The visitor's interests lead, as the page's hero field (DESIGN.md → Plan
 *   my visit); then what most visits need (time, museum unless locked,
 *   step-free route). First/returning visit and the group sit in a
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
                <InterestsField
                  value={answers.interests}
                  onChange={(value) => update('interests', value)}
                  dictation={dictation}
                />
                {/* The constraints follow, set apart so they don't compete with the interests. */}
                <Stack
                  gap="md"
                  className="border-t border-solid border-(--mantine-color-default-border) pt-(--mantine-spacing-md)"
                >
                  <VisitTimeField
                    value={answers.minutes}
                    onChange={(value) => update('minutes', value)}
                  />
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
                <MoreAboutVisit
                  answers={answers}
                  update={update}
                  setChildren={setChildren}
                  setAge={setAge}
                  ageError={ageError}
                  open={moreOpen}
                  onToggle={() => setMoreOpen((open) => !open)}
                />
              </Stack>
            </fieldset>
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
                {!planning
                  ? t('Usually takes a few seconds.')
                  : chosenName
                    ? t('Choosing the stops at {{museum}}…', { museum: chosenName })
                    : t('Finding the museum and choosing the stops…')}
              </Text>
            </Stack>
          </Stack>
        </form>
      </Container>
    </main>
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
      {/* Label and help sit outside the halo, which frames the field alone. */}
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
      <div className="plan-visit-interest" data-state={dictation.state}>
        <Textarea
          ref={field}
          size="lg"
          aria-labelledby="plan-interests-label"
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
    </Stack>
  )
}

/** How long the visit can take, as the planner's fixed choices (minutes or hours). */
function VisitTimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation('plan-visit')
  return (
    <Stack gap={6}>
      <Text size="md" fw={500} id="plan-time">
        {t('How much time do you have?')}
      </Text>
      <SegmentedControl
        size="md"
        aria-labelledby="plan-time"
        value={value}
        onChange={onChange}
        data={VISIT_MINUTES.map((value) => ({
          value: String(value),
          label:
            value < 60
              ? t('{{count}} min', { count: value })
              : t('{{count}} h', { count: value / 60 }),
        }))}
      />
    </Stack>
  )
}
