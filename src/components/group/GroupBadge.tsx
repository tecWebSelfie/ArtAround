'use client'

import { HOST_IDENTITY } from '@/lib/group'
import {
  useConnectionState,
  useParticipants,
  useRemoteParticipant,
} from '@livekit/components-react'
import { Button, Divider, Loader, Modal, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ConnectionState } from 'livekit-client'
import { UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GroupMembers } from './GroupMembers'
import { useGroup, useHostName } from './GroupProvider'
import { ShareGroup } from './ShareGroup'
import { useGroupExit } from './use-group-exit'

/**
 * The group's presence during the tour: a small pill in the tour header with
 * the number of people, which opens the group panel (who is here; for the
 * host, inviting and ending; for guests, leaving). Renders nothing when
 * touring alone. Turns orange for guests while the host's device is away.
 */
export function GroupBadge() {
  const group = useGroup()
  return group ? <GroupBadgeButton /> : null
}

function GroupBadgeButton() {
  const { t } = useTranslation('group')
  const group = useGroup()
  const [opened, panel] = useDisclosure(false)
  const participants = useParticipants()
  const connection = useConnectionState()
  const hostName = useHostName()
  const hostAway = !useRemoteParticipant(HOST_IDENTITY)
  const { confirmLeave, confirmEnd } = useGroupExit()
  if (!group) return null
  const isHost = group.membership.role === 'host'
  const connected = connection === ConnectionState.Connected
  const warn = !isHost && connected && hostAway

  return (
    <>
      <Button
        size="compact-sm"
        radius="xl"
        variant="light"
        color={warn ? 'orange' : 'blue'}
        leftSection={connected ? <UsersRound size={14} /> : <Loader size={12} />}
        onClick={panel.open}
        aria-label={t('Your group, {{count}} people', { count: participants.length })}
      >
        {participants.length}
      </Button>
      <Modal opened={opened} onClose={panel.close} title={t('Your group')} centered>
        <Stack gap="md">
          {warn && (
            <Text size="sm" c="orange.8" role="status">
              {t('{{name}} is not connected right now', { name: hostName })}
            </Text>
          )}
          <GroupMembers />
          {isHost && <ShareGroup code={group.membership.code} />}
          <Divider />
          {isHost ? (
            <Button variant="subtle" color="red" onClick={confirmEnd}>
              {t('End the group tour')}
            </Button>
          ) : (
            <Button variant="subtle" color="gray" onClick={confirmLeave}>
              {t('Leave the group')}
            </Button>
          )}
        </Stack>
      </Modal>
    </>
  )
}
