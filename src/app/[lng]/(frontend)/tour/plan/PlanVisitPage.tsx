'use client'

import { VISIT_MINUTES } from '@/lib/tour-plan'
import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Container,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { CircleAlert, Mic, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PlanPreview } from './PlanPreview'
import { usePlanVisit } from './use-plan-visit'
import { MoreAboutVisit } from './MoreAboutVisit'
import { useDictation, type DictationState, type Museum } from './plan-visit-state'

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
                <VisitTimeField
                  value={answers.minutes}
                  onChange={(value) => update('minutes', value)}
                />
                <InterestsField
                  value={answers.interests}
                  onChange={(value) => update('interests', value)}
                  dictation={dictation}
                />
                <Checkbox
                  size="md"
                  label={t('Wheelchair-accessible route')}
                  description={t('Directions avoid stairs and steps. The stops stay the same.')}
                  checked={answers.wheelchair}
                  onChange={(event) => update('wheelchair', event.currentTarget.checked)}
                />
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
                {planning &&
                  (chosenName
                    ? t('Choosing the stops at {{museum}}…', { museum: chosenName })
                    : t('Finding the museum and choosing the stops…'))}
              </Text>
            </Stack>
          </Stack>
        </form>
      </Container>
    </main>
  )
}

/** The dictation button's icon: a spinner while transcribing, stop while recording. */
function DictationIcon({ state }: { state: DictationState }) {
  if (state === 'transcribing') return <Loader size={16} />
  return state === 'recording' ? <Square size={16} /> : <Mic size={20} />
}

/**
 * The interests, typed or dictated: the microphone button records, the
 * words land in the field for editing, and recording and transcribing are
 * announced and shown under the field.
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
    <Stack gap={4}>
      <Textarea
        size="md"
        label={t('Interests')}
        description={t(
          'A topic, an artist, a period, or nothing at all. For example: a thesis on Parmigianino.',
        )}
        rows={3}
        maxLength={500}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
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
            <DictationIcon state={dictation.state} />
          </ActionIcon>
        }
      />
      {/* Recording and transcribing are announced, and shown under the field. */}
      <Text size="sm" c="dimmed" aria-live="polite">
        {dictationHelp}
      </Text>
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
