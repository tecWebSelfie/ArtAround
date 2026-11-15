'use client'

import { Button, Loader } from '@mantine/core'
import { Mic, Square } from 'lucide-react'

export type PlanVisitDictationState = 'idle' | 'recording' | 'transcribing'

/**
 * The planner's compact mic pill: recording adds a real stop state, voice bars,
 * and a timer without turning the control into a full-width recording panel.
 */
export function PlanVisitDictationButton({
  state,
  elapsedSeconds,
  labels,
  onToggle,
}: {
  state: PlanVisitDictationState
  elapsedSeconds: number
  labels: {
    dictate: string
    idleText: string
    stop: string
    transcribing: string
  }
  onToggle: () => void
}) {
  const recording = state === 'recording'
  const transcribing = state === 'transcribing'
  const minutes = Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(1, '0')
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0')

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      className="plan-visit-dictation"
      data-recording={recording ? 'true' : 'false'}
      leftSection={
        transcribing ? (
          <Loader size={14} aria-hidden />
        ) : recording ? (
          <Square size={14} fill="currentColor" aria-hidden />
        ) : (
          <Mic size={16} aria-hidden />
        )
      }
      loading={transcribing}
      disabled={transcribing}
      aria-busy={transcribing}
      aria-label={recording ? labels.stop : labels.dictate}
      aria-pressed={recording}
      title={recording ? labels.stop : labels.dictate}
      onClick={onToggle}
    >
      {!recording && (
        <span className="plan-visit-dictation-copy">
          {transcribing ? labels.transcribing : labels.idleText}
        </span>
      )}
      {recording && (
        <>
          <span className="plan-visit-voice-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="plan-visit-dictation-time" aria-hidden="true">
            {minutes}:{seconds}
          </span>
        </>
      )}
    </Button>
  )
}
