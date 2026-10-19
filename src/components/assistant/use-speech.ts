'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Plays text as speech through `/api/speech` and measures how loud it is, so
 * the assistant orb can pulse with its own voice. The loudness goes into a
 * ref (0–1) instead of React state: the orb reads it every animation frame
 * without re-rendering the navigation page.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const level = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const context = useRef<AudioContext | null>(null)
  const request = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    request.current?.abort()
    audio.current?.pause()
    audio.current = null
    level.current = 0
    setSpeaking(false)
  }, [])

  /** Resolves when playback ends; rejects when speech is unavailable. */
  const speak = useCallback(
    async (text: string) => {
      stop()
      const controller = new AbortController()
      request.current = controller
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Speech unavailable')
      const url = URL.createObjectURL(await response.blob())
      const player = new Audio(url)
      audio.current = player

      // Web Audio analyser: average waveform distance from silence → level.
      context.current ??= new AudioContext()
      const analyser = context.current.createAnalyser()
      analyser.fftSize = 512
      context.current.createMediaElementSource(player).connect(analyser)
      analyser.connect(context.current.destination)
      const samples = new Uint8Array(analyser.fftSize)
      const measure = () => {
        if (audio.current !== player) return
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) sum += Math.abs(sample - 128)
        level.current = Math.min(1, (sum / samples.length / 128) * 4)
        requestAnimationFrame(measure)
      }

      await context.current.resume()
      setSpeaking(true)
      await new Promise<void>((resolve) => {
        player.onended = player.onpause = () => resolve()
        void player.play().then(measure, () => resolve())
      })
      URL.revokeObjectURL(url)
      if (audio.current === player) stop()
    },
    [stop],
  )

  useEffect(() => stop, [stop])
  return { speak, stop, speaking, level }
}
