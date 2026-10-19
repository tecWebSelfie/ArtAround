'use client'

import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { AssistantOrb, type AssistantState } from './AssistantOrb'
import type { useSpeech } from './use-speech'
import {
  useVoiceAssistant,
  type AssistantCommand,
  type AssistantTurn,
} from './use-voice-assistant'

type Props = {
  enabled: boolean
  /** Opting in from the orb itself (the settings switch does the same). */
  onEnable: () => void
  commands: AssistantCommand[]
  context: string
  language: string
  speech: ReturnType<typeof useSpeech>
  onCommand: (id: string) => void
}

/**
 * The orb in the navbar. While the visitor has not opted in, it is dormant and
 * a tap turns the assistant on; the voice model only loads after that.
 */
export function NavigationAssistant({ enabled, onEnable, ...props }: Props) {
  const { t } = useTranslation('tour-navigation')
  if (!enabled) {
    return (
      <AssistantOrb
        state="off"
        label={t('Turn on the voice assistant')}
        status={t('Voice assistant off')}
        onPress={onEnable}
      />
    )
  }
  return <ActiveAssistant {...props} />
}

function ActiveAssistant({
  commands,
  context,
  language,
  speech,
  onCommand,
}: Omit<Props, 'enabled' | 'onEnable'>) {
  const { t } = useTranslation('tour-navigation')
  // The reply is also shown as text: a caption for people who can't hear it,
  // and the fallback when speech is unavailable.
  const showTurn = (turn: AssistantTurn) => {
    if (turn.commandId && commands.some((command) => command.id === turn.commandId)) {
      onCommand(turn.commandId)
    }
    if (turn.reply || turn.transcript) {
      notifications.show({
        id: 'assistant-reply',
        position: 'top-center',
        title: turn.transcript ? `“${turn.transcript}”` : undefined,
        message: turn.reply || t('Sorry, I did not catch that.'),
      })
    }
  }
  const assistant = useVoiceAssistant({
    commands,
    context,
    language,
    speech,
    onTurn: showTurn,
    onError: (reason) =>
      notifications.show({
        id: 'assistant-error',
        position: 'top-center',
        color: 'red',
        message:
          reason === 'mic'
            ? t('Allow the microphone to talk to the assistant.')
            : reason === 'speech'
              ? t('The answer could not be spoken; it is shown here instead.')
              : t('The assistant is not available right now.'),
      }),
  })
  const labels: Record<AssistantState, [label: string, status: string]> = {
    off: [t('Turn on the voice assistant'), t('Voice assistant off')],
    loading: [t('Voice assistant is starting'), t('Starting the voice assistant')],
    ready: [t('Talk to the assistant'), t('Voice assistant ready, microphone off')],
    listening: [t('Stop listening'), t('Listening')],
    thinking: [t('Assistant is thinking'), t('Thinking')],
    speaking: [t('Stop speaking'), t('Speaking')],
  }
  const [label, status] = labels[assistant.state]
  return (
    <AssistantOrb
      state={assistant.state}
      level={assistant.level}
      label={label}
      status={status}
      onPress={() => void assistant.press()}
    />
  )
}
