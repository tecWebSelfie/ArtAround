'use client'

import { VISIT_MINUTES, type PlannedTour, type PlanRequest } from '@/lib/tour-plan'
import { tourNavigationPath } from '@/lib/tour-navigation'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
  Timeline,
  Title,
} from '@mantine/core'
import { Clock, Footprints, MapPinCheck, Mic, Square } from 'lucide-react'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The "Plan my visit" form and its preview. Only form controls: the visitor
 * never writes a prompt (interests are an ordinary field, typed or dictated).
 * Submitting asks `/api/plan-tour` for a tour; the preview lists its stops
 * with the total time, then "Start the visit" opens tour navigation, or
 * "Change" goes back to the answers.
 */

type Museum = { value: string; label: string }

/** Tap to record, tap again to stop; the words land in the field for editing. */
function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const recorder = useRef<MediaRecorder | null>(null)

  const toggle = async () => {
    if (state === 'recording') return recorder.current?.stop()
    if (state !== 'idle') return
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
          const { text } = (await response.json()) as { text?: string }
          if (text) onText(text)
        } finally {
          setState('idle')
        }
      }
      recorder.current = media
      media.start()
      setState('recording')
    } catch {
      setState('idle')
    }
  }
  return { state, toggle }
}

export function PlanVisitPage({
  museums,
  lockedMuseum,
}: {
  museums: Museum[]
  /** Museum mode: the museum is fixed and its field is hidden. */
  lockedMuseum: string | null
}) {
  const { t } = useTranslation('plan-visit')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const [museumId, setMuseumId] = useState<string | null>(lockedMuseum)
  const [minutes, setMinutes] = useState('60')
  const [returning, setReturning] = useState('first')
  const [adults, setAdults] = useState<number | string>(1)
  const [childrenAges, setChildrenAges] = useState<string[]>([])
  const [interests, setInterests] = useState('')
  const [wheelchair, setWheelchair] = useState(false)
  const [status, setStatus] = useState<'form' | 'planning' | 'preview'>('form')
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlannedTour | null>(null)
  const dictation = useDictation((text) =>
    setInterests((current) => (current ? `${current} ${text}` : text).slice(0, 500)),
  )
  const ages = childrenAges
    .map(Number)
    .filter((age) => Number.isInteger(age) && age >= 0 && age < 18)

  const submit = async () => {
    setStatus('planning')
    setError(null)
    const body: PlanRequest = {
      museumId,
      minutes: Number(minutes),
      returning: returning === 'returning',
      adults: Number(adults) || 0,
      childrenAges: ages,
      interests,
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
        setError(
          json.error === 'museum'
            ? t('Choose the museum, or name it in your interests.')
            : json.error === 'empty'
              ? t('This museum has no free contents to visit yet.')
              : t('The visit could not be planned right now. Try again in a minute.'),
        )
        setStatus('form')
        return
      }
      setPlan(json)
      setStatus('preview')
    } catch {
      setError(t('The visit could not be planned right now. Try again in a minute.'))
      setStatus('form')
    }
  }

  const start = () => {
    if (!plan) return
    const query = new URLSearchParams()
    if (wheelchair) query.set('mobility', 'wheelchair')
    // With children, every stop opens in its children's version.
    if (ages.length) query.set('audience', 'children')
    const path = tourNavigationPath(lng, plan.id, 0)
    router.push((query.size ? `${path}?${query}` : path) as Route)
  }

  if (status === 'preview' && plan) {
    return (
      <Container size="xs" py="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>{plan.title}</Title>
            {plan.description && <Text c="dimmed">{plan.description}</Text>}
            <Group gap="xs">
              <Badge variant="light" leftSection={<Clock size={12} aria-hidden />}>
                {t('About {{count}} minutes', { count: plan.totalMinutes })}
              </Badge>
              <Badge variant="light" color="gray">
                {t('{{count}} stops', { count: plan.stops.length })}
              </Badge>
            </Group>
          </Stack>
          <Timeline active={plan.stops.length} bulletSize={22} lineWidth={2}>
            {plan.stops.map((stop, index) => (
              <Timeline.Item
                key={stop.id}
                bullet={
                  index === plan.stops.length - 1 ? (
                    <MapPinCheck size={12} aria-hidden />
                  ) : (
                    <Footprints size={12} aria-hidden />
                  )
                }
                title={stop.title}
              >
                <Text size="xs" c="dimmed">
                  {[stop.objectName, stop.room].filter(Boolean).join(' · ')} ·{' '}
                  {t('{{count}} min read', { count: stop.minutes })}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
          <Group grow>
            <Button variant="default" onClick={() => setStatus('form')}>
              {t('Change')}
            </Button>
            <Button onClick={start}>{t('Start the visit')}</Button>
          </Group>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="xs" py="xl">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>{t('Plan my visit')}</Title>
            <Text c="dimmed">{t('Tell us about your visit and we will choose the stops.')}</Text>
          </Stack>
          {!lockedMuseum && (
            <Select
              label={t('Museum')}
              placeholder={t('Pick one, or name it in your interests')}
              data={museums}
              value={museumId}
              onChange={setMuseumId}
              searchable
              clearable
            />
          )}
          <Stack gap={6}>
            <Text size="sm" fw={500} id="plan-time">
              {t('How much time do you have?')}
            </Text>
            <SegmentedControl
              aria-labelledby="plan-time"
              value={minutes}
              onChange={setMinutes}
              data={VISIT_MINUTES.map((value) => ({
                value: String(value),
                label:
                  value < 60
                    ? t('{{count}} min', { count: value })
                    : t('{{count}} h', { count: value / 60 }),
              }))}
            />
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={500} id="plan-returning">
              {t('Have you been here before?')}
            </Text>
            <SegmentedControl
              aria-labelledby="plan-returning"
              value={returning}
              onChange={setReturning}
              data={[
                { value: 'first', label: t('First visit') },
                { value: 'returning', label: t('Been before, surprise me') },
              ]}
            />
          </Stack>
          <Group grow align="flex-start">
            <NumberInput label={t('Adults')} min={0} max={30} value={adults} onChange={setAdults} />
            <TagsInput
              label={t("Children's ages")}
              placeholder={t('For example: 5, 8')}
              value={childrenAges}
              onChange={(values) =>
                setChildrenAges(values.filter((value) => /^\d{1,2}$/.test(value)))
              }
              splitChars={[',', ' ']}
            />
          </Group>
          <Textarea
            label={t('Interests')}
            description={t('A topic, an artist, a period… or nothing at all.')}
            placeholder={t('For example: I am writing a thesis on Parmigianino')}
            autosize
            minRows={2}
            maxLength={500}
            value={interests}
            onChange={(event) => setInterests(event.currentTarget.value)}
            rightSection={
              <ActionIcon
                variant={dictation.state === 'recording' ? 'filled' : 'subtle'}
                color={dictation.state === 'recording' ? 'red' : undefined}
                radius="xl"
                aria-label={dictation.state === 'recording' ? t('Stop dictating') : t('Dictate')}
                onClick={() => void dictation.toggle()}
                disabled={dictation.state === 'transcribing'}
              >
                {dictation.state === 'transcribing' ? (
                  <Loader size={14} />
                ) : dictation.state === 'recording' ? (
                  <Square size={14} />
                ) : (
                  <Mic size={16} />
                )}
              </ActionIcon>
            }
          />
          <Checkbox
            label={t('Wheelchair-accessible route')}
            checked={wheelchair}
            onChange={(event) => setWheelchair(event.currentTarget.checked)}
          />
          {error && <Alert color="orange">{error}</Alert>}
          <Button type="submit" fullWidth loading={status === 'planning'}>
            {t('Plan my visit')}
          </Button>
        </Stack>
      </form>
    </Container>
  )
}
