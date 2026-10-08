import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
import { ContentsCarousel } from '@/components/mantine/ContentsCarousel'
import { ToursCarousel } from '@/components/mantine/ToursCarousel'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Museum, User } from '@/payload-types'
import {
  Avatar,
  Badge,
  Group,
  Indicator,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { Amphora, BadgeCheck, BadgeInfo, Landmark, Palette, Verified } from 'lucide-react'

export const UserPage = async ({
  user,
  curatedMuseums,
}: {
  user: User
  curatedMuseums?: (string | Museum)[] | null
}) => {
  const { t } = await getT('user-page')
  const populatedTours = filterPopulated(user.authoredTours)
  const populatedContents = filterPopulated(user.authoredContents)

  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      <Group align="center" gap="xs">
        <Indicator
          color="transparent"
          offset={6}
          position="bottom-end"
          disabled={!user.highestStatus || user.highestStatus === 'none'}
          label={
            <ThemeIcon size="1.3em" radius="xl" color="blue" variant="filled">
              {user.highestStatus === 'verified' ? (
                <Verified size="80%" />
              ) : user.highestStatus === 'director' ? (
                <Landmark size="80%" />
              ) : user.highestStatus === 'curator' ? (
                <Palette size="80%" />
              ) : null}
            </ThemeIcon>
          }
        >
          <Avatar
            className="border-blue-400 border-3"
            name={user.name.fullName}
            color="initials"
            size="lg"
            src={isPopulated(user.avatar) ? (user.avatar.url ?? undefined) : undefined}
            alt={user.name.fullName}
          />
        </Indicator>
        <Stack justify="start" gap={0}>
          <Title order={2}>{user.name.fullName}</Title>
          <Text size="sm" c="dimmed">
            @{user.username}
          </Text>
        </Stack>
      </Group>
      <UserBadges user={user} curatedMuseums={curatedMuseums} />
      <Text>{user.bio}</Text>
      <ArtaroundTabs
        tabs={[
          {
            value: t('contents'),
            icon: <Amphora size={16} />,
            panel: (
              <Stack>
                {populatedTours.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t('No Tours authored yet')}
                  </Text>
                ) : (
                  <ToursCarousel tours={populatedTours} />
                )}
                {populatedContents.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t('No contents authored yet')}
                  </Text>
                ) : (
                  <ContentsCarousel contents={populatedContents} />
                )}
              </Stack>
            ),
          },
          {
            value: t('info'),
            icon: <BadgeInfo size={16} />,
            panel: (
              <Stack>
                <ArtaroundDataList
                  data={{
                    [t('Username')]: `@${user.username}`,
                    ...(user.email ? { [t('Email')]: user.email } : {}),
                    [t('Member since')]: new Date(user.createdAt).toLocaleDateString(),
                  }}
                />
              </Stack>
            ),
          },
        ]}
      />
    </Stack>
  )
}

// Mirrors MuseumBadges: a Group of Tooltip-wrapped Badges. Renders the
// verified-creator badge and one curator badge per museum (or a generic
// curator badge when no museum list was provided). Returns null when neither
// applies so no empty row is rendered.
export async function UserBadges({
  user,
}: {
  user: User
  curatedMuseums?: (string | Museum)[] | null
}) {
  const { t } = await getT('user-page')
  const verifiedMuseums = filterPopulated(user.verifieds) // list of museums where the user is verified, if any
  const curatorDocs = user.curatorOf?.docs ?? []
  const directorDocs = user.directorOf?.docs ?? []
  const curatedMuseums = filterPopulated(
    curatorDocs.map((membership) =>
      typeof membership === 'object' ? membership.museum : membership,
    ),
  )
  const directedMuseums = filterPopulated(
    directorDocs.map((membership) =>
      typeof membership === 'object' ? membership.museum : membership,
    ),
  )

  // Note: filterPopulated returns [] (truthy) when empty, so length checks are
  // required here — a bare truthiness check would render badges for everyone.
  // The generic Curator badge covers join rows whose memberships are not
  // populated (IDs only): the user holds the role but nothing resolved.
  const hasStaffRows = curatorDocs.length > 0 || directorDocs.length > 0

  if (verifiedMuseums.length === 0 && !hasStaffRows) return null

  return (
    <Group gap="xs">
      {verifiedMuseums.length > 0 && (
        <Tooltip label={t('Verified creator tooltip')} withArrow>
          <Badge color="blue" size="sm" leftSection={<BadgeCheck size={14} />}>
            {t('Verified creator')}
          </Badge>
        </Tooltip>
      )}
      {hasStaffRows &&
        (curatedMuseums.length > 0 ? (
          curatedMuseums.map((museum) => (
            <Tooltip key={museum.id} label={`${t('Curator at')} ${museum.name}`} withArrow>
              <Badge color="green" size="sm" leftSection={<Landmark size={14} />}>
                {museum.name}
              </Badge>
            </Tooltip>
          ))
        ) : directedMuseums.length > 0 ? (
          directedMuseums.map((museum) => (
            <Tooltip key={museum.id} label={`${t('Curator at')} ${museum.name}`} withArrow>
              <Badge color="green" size="sm" leftSection={<Landmark size={14} />}>
                {museum.name}
              </Badge>
            </Tooltip>
          ))
        ) : (
          <Tooltip label={t('Curator')} withArrow>
            <Badge color="green" size="sm" leftSection={<Landmark size={14} />}>
              {t('Curator')}
            </Badge>
          </Tooltip>
        ))}
    </Group>
  )
}
