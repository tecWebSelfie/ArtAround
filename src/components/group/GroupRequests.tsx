'use client'

import { HOST_IDENTITY } from '@/lib/group'
import {
  parseRequests,
  REQUESTS_ATTRIBUTE,
  type GroupRequest,
  type GroupRequestKind,
} from '@/lib/group-requests'
import { useParticipants } from '@livekit/components-react'
import { Badge, Group, Stack, Text } from '@mantine/core'
import { RoomEvent } from 'livekit-client'
import { useTranslation } from 'react-i18next'

/**
 * The host's view of "who asked what" (`src/lib/group-requests.ts`): for each
 * guest, the reading requests they made at each stop, live from their
 * `requests` attribute. Shown in the host's group panel; renders nothing
 * until someone has asked for something.
 */
export function GroupRequests() {
  const participants = useParticipants({
    updateOnlyOn: [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ParticipantAttributesChanged,
    ],
  })
  return (
    <GroupRequestList
      guests={participants
        .filter(({ identity }) => identity !== HOST_IDENTITY)
        .map(({ identity, name, attributes }) => ({
          identity,
          name: name ?? '',
          requests: parseRequests(attributes[REQUESTS_ATTRIBUTE]),
        }))}
    />
  )
}

type GuestRequests = { identity: string; name: string; requests: GroupRequest[] }

/** The list itself, without LiveKit (stories). */
export function GroupRequestList({ guests }: { guests: GuestRequests[] }) {
  const { t } = useTranslation('group')
  const asking = guests.filter(({ requests }) => requests.length)
  if (!asking.length) return null
  // Literal t() calls so i18next-cli sees every label.
  const label: Record<GroupRequestKind, string> = {
    more: t('Tell me more'),
    curiosities: t('Curiosities'),
    story: t('Its story'),
    'level:easy': t('Easy wording'),
    'level:medium': t('Medium wording'),
    'level:hard': t('In-depth wording'),
    shorter: t('Shorter'),
    children: t('For children'),
  }
  return (
    <Stack gap="xs" aria-live="polite">
      <Text size="sm" fw={500}>
        {t('Requests')}
      </Text>
      {asking.map((guest) => {
        const stops = [...new Set(guest.requests.map(({ stop }) => stop))].sort((a, b) => a - b)
        return (
          <Stack key={guest.identity} gap={4}>
            <Group gap="xs">
              <Text size="sm">{guest.name}</Text>
              <Badge size="sm" variant="light" circle>
                {guest.requests.length}
              </Badge>
            </Group>
            {stops.map((stop) => (
              <Text key={stop} size="xs" c="dimmed">
                {t('Stop {{number}}', { number: stop + 1 })}:{' '}
                {guest.requests
                  .filter((request) => request.stop === stop)
                  .map(({ kind }) => label[kind] ?? kind)
                  .join(', ')}
              </Text>
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}
