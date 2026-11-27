'use client'

import type { PlannedTour } from '@/lib/tour-plan'
import type { MuseumPoint } from '@/lib/museum-location'
import { createSessionStore } from '@/lib/session-store'
import { useEffect, useRef, useState } from 'react'

/**
 * The plan form's data: its answers (kept in sessionStorage with the last
 * plan), the count fields' shared props, and dictation for the interests.
 */

/** `label` is "Name, City" for recognition; `name` alone names it in copy. */
export type Museum = {
  value: string
  label: string
  name: string
  /** GeoJSON [lng, lat]: the anchor for the nearest-museum suggestions. */
  latlng: MuseumPoint | null
}

/** The form's answers, as kept in state and in sessionStorage. */
export type Answers = {
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

export const DEFAULT_ANSWERS: Answers = {
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
export const STORAGE_KEY = 'aa-plan-visit'
export type Stored = { answers: Answers; plan: PlannedTour | null }
export const store = createSessionStore<Stored>((stored) => {
  const parsed = stored as Partial<Stored> | null
  return { answers: { ...DEFAULT_ANSWERS, ...parsed?.answers }, plan: parsed?.plan ?? null }
})
export const EMPTY: Stored = { answers: DEFAULT_ANSWERS, plan: null }

export const MAX_CHILDREN = 10

/**
 * The form's and the preview's page: balanced wrapping, and readable error,
 * dimmed and description text (darker in light mode, lighter in dark).
 */
export const PLAN_PAGE_CLASS =
  'text-pretty [--mantine-color-error:light-dark(var(--mantine-color-red-8),var(--mantine-color-red-4))] [&_.mantine-InputWrapper-description]:leading-normal [--mantine-color-dimmed:light-dark(var(--mantine-color-gray-7),var(--mantine-color-gray-5))]'

/** Props of every count field: whole numbers in range, a numeric keypad, no steppers. */
export const COUNT_INPUT = {
  size: 'md',
  allowDecimal: false,
  allowNegative: false,
  clampBehavior: 'strict',
  hideControls: true,
  inputMode: 'numeric',
} as const

export type DictationState = 'idle' | 'recording' | 'transcribing'
export type DictationError = 'microphone' | 'transcription' | null

/** The Web Speech API's recognizer, which TypeScript's DOM types leave out. */
type SpeechRecognizer = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult:
    | ((event: { results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }> }) => void)
    | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognizer
  webkitSpeechRecognition?: new () => SpeechRecognizer
}
/** Recognizer errors that mean no microphone, rather than words not understood. */
const MICROPHONE_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture'])

/**
 * Tap to record, tap again to stop; the words land in the field for editing.
 * The browser's own speech recognition, where there is one, shows the words
 * while they are spoken (`interimText`); elsewhere the recording goes to
 * `/api/transcribe` once stopped. `elapsedSeconds` times the recording, and
 * `completed` says the last dictation reached the field.
 */
export function useDictation(onText: (text: string) => void, language: string) {
  const [state, setState] = useState<DictationState>('idle')
  const [error, setError] = useState<DictationError>(null)
  const [interimText, setInterimText] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [completed, setCompleted] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const recognition = useRef<SpeechRecognizer | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)

  const startTimer = () => {
    const startedAt = Date.now()
    setElapsedSeconds(0)
    timer.current = window.setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    )
  }
  const stopTimer = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
  }
  const finish = (text: string | undefined) => {
    if (!text) return
    onText(text)
    setCompleted(true)
  }
  const recording = () => {
    startTimer()
    setState('recording')
  }

  // Leaving the page mid-dictation releases the microphone and the timer.
  useEffect(
    () => () => {
      stopTimer()
      recognition.current?.abort()
      stream.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  const listen = (Recognizer: new () => SpeechRecognizer) => {
    const instance = new Recognizer()
    let final = ''
    instance.lang = language
    instance.continuous = true
    instance.interimResults = true
    instance.onresult = (event) => {
      // Results accumulate over the session: rebuild both texts from them.
      const results = Array.from(event.results)
      const text = (done: boolean) =>
        results
          .filter((result) => result.isFinal === done)
          .map((result) => result[0]?.transcript ?? '')
          .join('')
      final = text(true)
      setInterimText(text(false).trim())
    }
    instance.onerror = (event) =>
      setError(MICROPHONE_ERRORS.has(event.error) ? 'microphone' : 'transcription')
    instance.onend = () => {
      stopTimer()
      finish(final.trim())
      setInterimText('')
      setState('idle')
      recognition.current = null
    }
    recognition.current = instance
    instance.start()
    recording()
  }

  const record = async () => {
    const media = new MediaRecorder(
      (stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })),
    )
    const chunks: Blob[] = []
    media.ondataavailable = (event) => chunks.push(event.data)
    media.onstop = async () => {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      recorder.current = null
      stopTimer()
      setState('transcribing')
      try {
        const form = new FormData()
        form.append('audio', new Blob(chunks, { type: media.mimeType }), 'interests.webm')
        const response = await fetch('/api/transcribe', { method: 'POST', body: form })
        if (!response.ok) throw new Error('transcription')
        finish(((await response.json()) as { text?: string }).text)
      } catch {
        setError('transcription')
      } finally {
        setState('idle')
      }
    }
    recorder.current = media
    media.start()
    recording()
  }

  const toggle = async () => {
    if (state === 'recording') {
      if (recognition.current) recognition.current.stop()
      else recorder.current?.stop()
      return
    }
    if (state !== 'idle') return
    setError(null)
    setCompleted(false)
    setInterimText('')
    const { SpeechRecognition, webkitSpeechRecognition } = window as SpeechWindow
    try {
      const Recognizer = SpeechRecognition ?? webkitSpeechRecognition
      if (Recognizer) listen(Recognizer)
      else await record()
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
  return { state, error, interimText, elapsedSeconds, completed, toggle }
}
