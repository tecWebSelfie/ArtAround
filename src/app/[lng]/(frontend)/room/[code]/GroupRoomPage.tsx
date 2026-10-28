'use client'

import { GroupMembers } from '@/components/group/GroupMembers'
import { GroupNameForm } from '@/components/group/GroupNameForm'
import { useGroup, useGroupSettings, useJoinGroup } from '@/components/group/GroupProvider'
import { GroupRoom } from '@/components/group/GroupRoom'
import { ShareGroup } from '@/components/group/ShareGroup'
import { useGroupExit } from '@/components/group/use-group-exit'
import { HOST_IDENTITY } from '@/lib/group'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { tourNavigationPath } from '@/lib/tour-navigation'
import { useConnectionState, useRemoteParticipant } from '@livekit/components-react'
import {
  Alert,
  AspectRatio,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useMounted } from '@mantine/hooks'
import { ConnectionState } from 'livekit-client'
import { Play } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

type RoomTour = {
  id: string
  /** The tour's museum: its map URL is `/museum/{museumId}/navigation/tour/{id}/…`. */
  museumId: string
  title: string
  thumbnail: { url: string; alt: string } | null
}

/**
 * Join form, then waiting room, for one group code (see page.tsx).
 * Waits for mount: whether this device is already in the group is in
 * localStorage, and showing the join form first would flash for members.
 */
export function GroupRoomPage({
  code,
  hostName,
  showResults,
  tour,
}: {
  code: string
  hostName: string
  /** The host chose to see everyone's quiz score; guests are told before joining. */
  showResults: boolean
  tour: RoomTour | null
}) {
  const mounted = useMounted()
  const group = useGroup()

  if (!mounted) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }
  return (
    <Container size="xs" py="xl">
      {!tour ? (
        <GroupEnded />
      ) : group?.membership.code === code ? (
        // LiveKit's hooks need the room, which GroupProvider creates lazily.
        <GroupRoom
          fallback={
            <Center py="xl">
              <Loader />
            </Center>
          }
        >
          <WaitingRoom code={code} tour={tour} />
        </GroupRoom>
      ) : (
        <JoinGroup code={code} hostName={hostName} showResults={showResults} tour={tour} />
      )}
    </Container>
  )
}

function TourHeading({ tour }: { tour: RoomTour }) {
  return (
    <Group wrap="nowrap" gap="md">
      <AspectRatio ratio={1} w={64} style={{ flexShrink: 0 }}>
        <Image
          src={tour.thumbnail?.url}
          fallbackSrc={PLACEHOLDER_IMAGE}
          alt={tour.thumbnail?.alt ?? ''}
          radius="md"
        />
      </AspectRatio>
      <Title order={1} size="h2">
        {tour.title}
      </Title>
    </Group>
  )
}

function JoinGroup({
  code,
  hostName,
  showResults,
  tour,
}: {
  code: string
  hostName: string
  showResults: boolean
  tour: RoomTour
}) {
  const { t } = useTranslation('group')
  const join = useJoinGroup()
  const current = useGroup()

  return (
    <Stack gap="lg">
      <TourHeading tour={tour} />
      <Text>{t('{{name}} invited you to visit this tour together.', { name: hostName })}</Text>
      {showResults && (
        <Text size="sm" c="dimmed">
          {t('{{name}} will see your score if the tour ends with a quiz.', { name: hostName })}
        </Text>
      )}
      {current && (
        <Alert color="orange" variant="light">
          {t('Joining this group makes you leave your current one.')}
        </Alert>
      )}
      <GroupNameForm
        submitLabel={t('Join the group')}
        onSubmit={(name) => join({ code, tourId: tour.id, name, role: 'guest' })}
      />
    </Stack>
  )
}

/**
 * Before the start: the code, who has arrived, and for the host the ways to
 * invite and the start button. Guests see who they are waiting for; once the
 * host starts, GroupProvider moves them into the tour.
 */
function WaitingRoom({ code, tour }: { code: string; tour: RoomTour }) {
  const { t } = useTranslation('group')
  const group = useGroup()
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const connection = useConnectionState()
  const { hostName } = useGroupSettings()
  const hostHere = Boolean(useRemoteParticipant(HOST_IDENTITY))
  const { confirmLeave, confirmEnd } = useGroupExit()
  if (!group) return null
  const isHost = group.membership.role === 'host'

  return (
    <Stack gap="lg">
      <TourHeading tour={tour} />
      <Stack gap={4} align="center">
        <Text size="sm" c="dimmed">
          {t('Group code')}
        </Text>
        {/* Monospace: the code is read aloud and copied letter by letter. */}
        <Text ff="monospace" fz={40} fw={700} lh={1} style={{ letterSpacing: '0.12em' }}>
          {code}
        </Text>
      </Stack>
      {isHost && <ShareGroup code={code} />}
      <Divider />
      {connection === ConnectionState.Connected ? (
        <GroupMembers />
      ) : (
        <Group gap="xs" c="dimmed">
          <Loader size="xs" />
          <Text size="sm">{t('Connecting to the group')}</Text>
        </Group>
      )}
      <Divider />
      {isHost ? (
        <Stack gap="xs">
          <Button
            size="md"
            leftSection={<Play size={18} />}
            onClick={() => {
              group.start()
              router.push(tourNavigationPath(lng, tour.museumId, tour.id, 0))
            }}
          >
            {group.membership.started ? t('Back to the tour') : t('Start the tour')}
          </Button>
          <Button variant="subtle" color="red" onClick={confirmEnd}>
            {t('End the group tour')}
          </Button>
        </Stack>
      ) : (
        <Stack gap="xs" align="center">
          <Group gap="xs" wrap="nowrap" role="status">
            <Loader size="xs" type="dots" />
            <Text size="sm">
              {hostHere
                ? t('Waiting for {{name}} to start the tour', { name: hostName })
                : t('{{name}} is not connected right now', { name: hostName })}
            </Text>
          </Group>
          <Button variant="subtle" color="gray" onClick={confirmLeave}>
            {t('Leave the group')}
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

function GroupEnded() {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Stack gap="md" align="center" ta="center">
      <Title order={1} size="h2">
        {t('This group has ended')}
      </Title>
      <Text c="dimmed">{t('Ask for a new code, or visit the tour on your own.')}</Text>
      <Button component={Link} href={`/${lng}/navigator` as Route} variant="default">
        {t('Back to the navigator')}
      </Button>
    </Stack>
  )
}
