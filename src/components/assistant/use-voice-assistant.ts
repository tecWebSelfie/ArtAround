'use client'

import { MicVAD, utils } from '@ricky0123/vad-web'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AssistantState } from './AssistantOrb'
import type { useSpeech } from './use-speech'

/** What the assistant may do, as sent to `/api/assistant`. */
export type AssistantCommand = { id: string; label: string; description: string }

export type AssistantTurn = { transcript: string; reply: string; commandId: string | null }

/**
 * One tap-to-talk turn, start to finish:
 *
 *   tap → mic opens → voice activity detection hears the visitor stop
 *   → mic closes → `/api/assistant` transcribes and picks a command
 *   → `onTurn` runs it → the reply is spoken
 *
 * Voice activity detection (Silero VAD, run in the browser by
 * `@ricky0123/vad-web`) is what closes the mic by itself, so the assistant
 * never keeps listening to people nearby.
 *
 * The detector is created once, on the first tap, and reused. Creating it on
 * mount (as `useMicVAD` does) downloaded ~16 MB for visitors who never talk,
 * and under React Strict Mode's double mount two detectors initialised the
 * ONNX runtime at once and neither finished.
 */
export function useVoiceAssistant({
  commands,
  context,
  language,
  speech,
  onTurn,
  onError,
}: {
  commands: AssistantCommand[]
  /** Short description of where the visitor is and is going. */
  context: string
  language: string
  speech: ReturnType<typeof useSpeech>
  onTurn: (turn: AssistantTurn) => void
  onError: (reason: 'mic' | 'request' | 'speech') => void
}) {
  const [starting, setStarting] = useState(false)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  // Speech probability of the latest mic frame drives the orb while listening.
  const micLevel = useRef(0)
  const detector = useRef<Promise<MicVAD> | null>(null)

  // The detector outlives renders, so it calls the latest values through a ref.
  const latest = useRef({ commands, context, language, speech, onTurn, onError })
  latest.current = { commands, context, language, speech, onTurn, onError }

  const sendTurn = useCallback(async (audio: Float32Array) => {
    const { commands, context, language, speech, onTurn, onError } = latest.current
    setThinking(true)
    try {
      const form = new FormData()
      form.append('audio', new Blob([utils.encodeWAV(audio)], { type: 'audio/wav' }), 'turn.wav')
      form.append('commands', JSON.stringify(commands))
      form.append('context', context)
      form.append('language', language)
      const response = await fetch('/api/assistant', { method: 'POST', body: form })
      if (!response.ok) throw new Error(String(response.status))
      const turn = (await response.json()) as AssistantTurn
      setThinking(false)
      onTurn(turn)
      if (turn.reply) await speech.speak(turn.reply).catch(() => onError('speech'))
    } catch {
      setThinking(false)
      onError('request')
    }
  }, [])

  const getDetector = useCallback(() => {
    detector.current ??= MicVAD.new({
      startOnLoad: false,
      model: 'v5',
      // Copied into public/vad by scripts/copy-vad-assets.mjs (postinstall).
      baseAssetPath: '/vad/',
      onnxWASMBasePath: '/vad/',
      // Silence that ends a turn: long enough for a pause between words.
      redemptionMs: 900,
      onFrameProcessed: (probabilities) => {
        micLevel.current = probabilities.isSpeech
      },
      onSpeechEnd: async (audio) => {
        // Close the mic first: one request per tap.
        const vad = await detector.current
        await vad?.pause()
        setListening(false)
        micLevel.current = 0
        await sendTurn(audio)
      },
    })
    return detector.current
  }, [sendTurn])

  // Release the microphone and the model when the assistant is switched off.
  useEffect(
    () => () => {
      void detector.current?.then((vad) => vad.destroy())
      detector.current = null
    },
    [],
  )

  const state: AssistantState = starting
    ? 'loading'
    : listening
      ? 'listening'
      : thinking
        ? 'thinking'
        : speech.speaking
          ? 'speaking'
          : 'ready'

  /** The orb's tap: talk, or stop whatever is happening now. */
  const press = useCallback(async () => {
    if (state === 'listening') {
      await (await detector.current)?.pause()
      return setListening(false)
    }
    if (state === 'speaking') return speech.stop()
    if (state !== 'ready') return
    // The first tap downloads the model and asks for the microphone.
    setStarting(true)
    try {
      const vad = await getDetector()
      await vad.start()
      setListening(true)
    } catch (error) {
      console.warn('Voice assistant unavailable:', error)
      detector.current = null
      onError('mic')
    } finally {
      setStarting(false)
    }
  }, [state, speech, getDetector, onError])

  const level = state === 'listening' ? micLevel : speech.level
  return { state, press, level }
}
