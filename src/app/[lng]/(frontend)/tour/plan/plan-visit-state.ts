'use client'

import type { PlannedTour } from '@/lib/tour-plan'
import { createSessionStore } from '@/lib/session-store'
import { useRef, useState } from 'react'

/**
 * The plan form's data: its answers (kept in sessionStorage with the last
 * plan), the count fields' shared props, and dictation for the interests.
 */

/** `label` is "Name, City" for the Select; `name` alone names it in copy. */
export type Museum = { value: string; label: string; name: string }

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

/** Tap to record, tap again to stop; the words land in the field for editing. */
export function useDictation(onText: (text: string) => void) {
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
