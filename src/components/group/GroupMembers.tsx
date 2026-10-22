'use client'

import { HOST_IDENTITY } from '@/lib/group'
import { useParticipants } from '@livekit/components-react'
import { Avatar, Badge, Group, Stack, Text } from '@mantine/core'
import { RoomEvent } from 'livekit-client'
import { useTranslation } from 'react-i18next'

export type GroupMember = { identity: string; name: string; isMe: boolean }

/**
 * Who is in the group, live: LiveKit's `useParticipants` updates as people
 * join, reconnect and leave. Used by the waiting room and the group panel
 * during the tour; the list itself is `GroupMemberList`.
 */
/** Who is in the room and their names; attribute changes don't matter here. */
export const MEMBERSHIP_EVENTS = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.ParticipantNameChanged,
]

export function GroupMembers() {
  const participants = useParticipants({ updateOnlyOn: MEMBERSHIP_EVENTS })
  return (
    <GroupMemberList
      members={participants.map(({ identity, name, isLocal }) => ({
        identity,
        name: name ?? '',
        isMe: isLocal,
      }))}
    />
  )
}

/** The host comes first; the visitor's own row says "(you)". No LiveKit needed (stories). */
export function GroupMemberList({ members }: { members: GroupMember[] }) {
  const { t } = useTranslation('group')
  const sorted = [...members].sort(
    (a, b) => Number(b.identity === HOST_IDENTITY) - Number(a.identity === HOST_IDENTITY),
  )

  return (
    <Stack gap="xs" aria-live="polite">
      <Text size="sm" fw={500}>
        {t('{{count}} in the group', { count: members.length })}
      </Text>
      {sorted.map((member) => (
        <Group key={member.identity} gap="sm" wrap="nowrap">
          <Avatar name={member.name} color="initials" size="sm" />
          <Text size="sm" truncate>
            {member.name}
            {member.isMe && (
              <Text span c="dimmed" inherit>
                {' '}
                {t('(you)')}
              </Text>
            )}
          </Text>
          {member.identity === HOST_IDENTITY && (
            <Badge variant="light" size="sm" ml="auto">
              {t('Host')}
            </Badge>
          )}
        </Group>
      ))}
    </Stack>
  )
}
