'use client'

import { useState } from 'react'
import { BarVisualizer, LiveKitRoom, RoomAudioRenderer, useVoiceAssistant } from '@livekit/components-react'
import '@livekit/components-styles'
import { Button, Card, Group, Stack, Text } from '@mantine/core'

type TokenResponse = {
  token: string
  url: string
  room: string
  identity: string
  guest: boolean
}

function AssistantView() {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant()
  const recent = agentTranscriptions.slice(-6)

  return (
    <Stack gap="md">
      <Group justify="center">
        <BarVisualizer trackRef={audioTrack} barCount={24} />
      </Group>
      <Text ta="center" size="sm" c="dimmed">
        Agent state: {state}
      </Text>
      <Stack gap="xs">
        {recent.map((t, i) => (
          <Text key={`${t.receivedAt}-${i}`} size="sm">
            <strong>Agent:</strong> {t.text}
          </Text>
        ))}
        {recent.length === 0 && (
          <Text size="sm" c="dimmed">
            Transcript will appear here once the agent speaks.
          </Text>
        )}
      </Stack>
    </Stack>
  )
}

export default function VoiceAgent() {
  const [session, setSession] = useState<TokenResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/livekit/token', { method: 'POST' })
      const data = (await res.json()) as TokenResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not get a voice token.')
      setSession(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.')
    } finally {
      setLoading(false)
    }
  }

  const disconnect = () => setSession(null)

  if (!session) {
    return (
      <Stack gap="md" align="center">
        <Button onClick={connect} loading={loading}>
          Start voice chat
        </Button>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Text size="xs" c="dimmed" ta="center">
          Prototype: guest sessions are short-lived. Please grant microphone access when prompted.
        </Text>
      </Stack>
    )
  }

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <LiveKitRoom
          token={session.token}
          serverUrl={session.url}
          connect
          audio
          video={false}
          onDisconnected={disconnect}
        >
          <RoomAudioRenderer />
          <AssistantView />
        </LiveKitRoom>
        <Group justify="center">
          <Button variant="outline" onClick={disconnect}>
            End call
          </Button>
        </Group>
        {session.guest && (
          <Text size="xs" c="dimmed" ta="center">
            Guest prototype session — log in for longer sessions in the future.
          </Text>
        )}
      </Stack>
    </Card>
  )
}
