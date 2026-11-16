import { BackButton } from '@/components/navigation/BackButton'
import { EditableSection } from '@/components/editing/EditableSection'
import { ProfileForm } from '@/components/editing/forms/ProfileForm'
import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { ArtaroundEmptyState } from '@/components/mantine/ArtaroundEmptyState'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
import { ContentsCarousel } from '@/components/mantine/ContentsCarousel'
import { ToursCarousel } from '@/components/mantine/ToursCarousel'
import { scopedSearchHref } from '@/lib/search-url'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Museum, Tour, User } from '@/payload-types'
import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { ProfileMuseumFilter } from './ProfileMuseumFilter'
import {
  Avatar,
  Badge,
  Card,
  Grid,
  GridCol,
  Group,
  Indicator,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { Amphora, BadgeCheck, BadgeInfo, Landmark, Palette, Verified } from 'lucide-react'

const STATUS_ICON = { verified: Verified, director: Landmark, curator: Palette, none: null }

/** The populated museums of membership join rows (ids alone are dropped). */
const museumsOf = (memberships: (string | { museum: string | Museum })[] = []) =>
  filterPopulated(
    memberships.map((membership) =>
      typeof membership === 'object' ? membership.museum : membership,
    ),
  )

/**
 * A visitor's public profile. Phones: one column (identity with the account
 * actions at its top-right, badges, bio, then the tabs). From `md`: a 1140px
 * container with the profile as a column on the left and the tabs (authored
 * tours and contents, info) using the remaining width on the right.
 */
export const UserPage = async ({
  user,
  curatedMuseums,
  isSelf = false,
  museumFilter,
  needsFixingTours = [],
  accountActions,
}: {
  user: User
  curatedMuseums?: (string | Museum)[] | null
  /** The visitor's own profile: inline profile editing. */
  isSelf?: boolean
  /**
   * Museum mode only: the locked museum's name and whether the tours and
   * contents passed in are narrowed to it (`?scope=all` lifts it).
   */
  museumFilter?: { name: string; museumOnly: boolean }
  /**
   * The owner's own tours with no visitable stop: unlisted for everyone, shown
   * to their author only, so they can reach the editor and fix them.
   */
  needsFixingTours?: Tour[]
  /** Owner-only actions (sign out), rendered by the route so stories stay server-action free. */
  accountActions?: ReactNode
}) => {
  const { t, lng } = await getT('user-page')
  const { t: te } = await getT('editing')
  return (
    // Rhythm: tight inside the identity block (avatar, name, @handle,
    // badges), generous between it, the bio and the tabs, so the bio reads as
    // its own section rather than a caption of the name.
    <Stack
      component="main"
      mx={{ base: 'md', sm: 'xl', md: 'auto' }}
      px={{ md: 'xl' }}
      maw={{ md: 1204 }}
      mt="sm"
    >
      {/* Up a level: back where the visitor came from (a tour's author, the
          marketplace), else the navigator. */}
      <BackButton href={`/${lng}/navigator` as Route} />
      {/* Grid lays out with `gap`: below md (full-width columns, `xl` gap)
          it stacks exactly like a single Stack with the same rhythm. */}
      <Grid gap={{ base: 'xl', md: 48 }} align="flex-start">
        {/* Not sticky: a long bio would make it taller than the viewport. */}
        <GridCol span={{ base: 12, md: 4 }}>
          <Stack gap="xl">
            <ProfileIdentity
              user={user}
              accountActions={accountActions}
              // An async Server Component: kept in this tree, so it is
              // awaited with the page (and by `serverComponentStory`).
              badges={<UserBadges user={user} curatedMuseums={curatedMuseums} />}
            />
            <EditableSection
              title={te('About me')}
              canEdit={isSelf}
              // The profile keeps the bare pencil: "Sign out" already sits at the
              // name's height, and a second labelled button here felt heavy.
              iconOnly
              form={
                isSelf && <ProfileForm user={{ id: user.id, name: user.name, bio: user.bio }} />
              }
            >
              <Text>{user.bio}</Text>
            </EditableSection>
          </Stack>
        </GridCol>
        <GridCol span={{ base: 12, md: 8 }}>
          <ArtaroundTabs
            tabs={[
              {
                value: t('contents'),
                icon: <Amphora size={16} />,
                panel: (
                  <AuthoredWork
                    user={user}
                    isSelf={isSelf}
                    museumFilter={museumFilter}
                    needsFixingTours={needsFixingTours}
                  />
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
                        // In the page's language, not the server's default locale.
                        [t('Member since')]: new Intl.DateTimeFormat(lng, {
                          dateStyle: 'medium',
                        }).format(new Date(user.createdAt)),
                      }}
                    />
                  </Stack>
                ),
              },
            ]}
          />
        </GridCol>
      </Grid>
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
  // Museums where the user holds the verified-creator badge (verified memberships).
  const verifiedMuseums = museumsOf(user.verifiedAt?.docs)
  const curatorDocs = user.curatorOf?.docs ?? []
  const directorDocs = user.directorOf?.docs ?? []
  // Curated museums first; a director's museums when there are none.
  const curatedMuseums = museumsOf(curatorDocs)
  const staffMuseums = curatedMuseums.length > 0 ? curatedMuseums : museumsOf(directorDocs)

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
          <Badge size="sm" leftSection={<BadgeCheck size={14} />}>
            {t('Verified creator')}
          </Badge>
        </Tooltip>
      )}
      {hasStaffRows &&
        (staffMuseums.length > 0 ? (
          staffMuseums.map((museum) => (
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

/**
 * Who the profile is: the avatar (with the highest status as a badge), the
 * name and @handle, the account actions at the top-right corner (where
 * account utilities live, out of the profile's flow), then the badges.
 */
function ProfileIdentity({
  user,
  accountActions,
  badges,
}: {
  user: User
  accountActions?: ReactNode
  badges: ReactNode
}) {
  const StatusIcon = STATUS_ICON[user.highestStatus ?? 'none']
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group align="center" gap="xs" wrap="nowrap" miw={0}>
          <Indicator
            color="transparent"
            offset={6}
            position="bottom-end"
            disabled={!StatusIcon}
            label={
              <ThemeIcon size="1.3em" radius="xl" variant="filled">
                {StatusIcon && <StatusIcon size="80%" />}
              </ThemeIcon>
            }
          >
            <Avatar
              className="border-(--mantine-primary-color-4) border-3"
              name={user.name.fullName}
              color="initials"
              size="lg"
              src={isPopulated(user.avatar) ? (user.avatar.url ?? undefined) : undefined}
              alt={user.name.fullName}
            />
          </Indicator>
          <Stack justify="start" gap={0} miw={0}>
            <Title order={1} size="h2">
              {user.name.fullName}
            </Title>
            <Text size="sm" c="dimmed">
              @{user.username}
            </Text>
          </Stack>
        </Group>
        {accountActions}
      </Group>
      {badges}
    </Stack>
  )
}

/**
 * The person's tours and contents, filtered to the locked museum in museum
 * mode (with the filter shown). Empty: the section keeps its heading and
 * place; the owner hears what goes there and gets the way to make the first
 * one, a visitor reads a plain statement.
 */
async function AuthoredWork({
  user,
  isSelf,
  museumFilter,
  needsFixingTours,
}: {
  user: User
  isSelf: boolean
  museumFilter?: { name: string; museumOnly: boolean }
  needsFixingTours: Tour[]
}) {
  const { t, lng } = await getT('user-page')
  // Authorship is a join (`contents.author` / `tours.author`), hence `.docs`.
  const populatedTours = filterPopulated(user.authoredTours?.docs)
  const populatedContents = filterPopulated(user.authoredContents?.docs)
  // Empty sections address a visitor's profile by its owner's first name.
  const firstName = user.name.firstName || user.name.fullName
  // An empty section under the museum filter says so, instead of claiming
  // the person has made nothing at all.
  const filteredTo = museumFilter?.museumOnly ? museumFilter.name : null
  // Empty lists: filtered to a museum, the owner's invitation to start, or a
  // plain statement for a visitor.
  let noToursTitle: string
  let noContentsTitle: string
  if (filteredTo) {
    noToursTitle = t('No tours at {{museum}}', { museum: filteredTo })
    noContentsTitle = t('No contents at {{museum}}', { museum: filteredTo })
  } else if (isSelf) {
    noToursTitle = t('Your first tour starts here')
    noContentsTitle = t('Tell the story of a work')
  } else {
    noToursTitle = t('{{name}} hasn’t created any tours yet', { name: firstName })
    noContentsTitle = t('{{name}} hasn’t written any contents yet', { name: firstName })
  }
  // The owner's invitations: what goes in each section (not while filtered:
  // the person may well have made some elsewhere) and the way to make the first.
  const own = isSelf
    ? {
        tours: {
          description: filteredTo
            ? undefined
            : t('Pick the works you love and put them in order: a route to take and share.'),
          action: { label: t('Create a tour'), href: `/${lng}/tour/new` as Route },
        },
        contents: {
          description: filteredTo
            ? undefined
            : t(
                'What you write about a work shows up here, ready for the visitors who stop in front of it.',
              ),
          action: { label: t('Write a content'), href: `/${lng}/content/new` as Route },
        },
      }
    : null
  return (
    <Stack>
      {museumFilter && (
        <ProfileMuseumFilter museumName={museumFilter.name} museumOnly={museumFilter.museumOnly} />
      )}
      {populatedTours.length === 0 ? (
        <ArtaroundEmptyState
          kind="tour"
          heading={t('Tours')}
          title={noToursTitle}
          description={own?.tours.description}
          action={own?.tours.action}
        />
      ) : (
        <ToursCarousel
          tours={populatedTours}
          seeAllHref={scopedSearchHref(lng, 'tours', 'author', user.id) as Route}
        />
      )}
      {isSelf && needsFixingTours.length > 0 && <NeedsFixingTours tours={needsFixingTours} />}
      {populatedContents.length === 0 ? (
        <ArtaroundEmptyState
          kind="content"
          heading={t('Contents')}
          title={noContentsTitle}
          description={own?.contents.description}
          action={own?.contents.action}
        />
      ) : (
        <ContentsCarousel
          contents={populatedContents}
          seeAllHref={scopedSearchHref(lng, 'contents', 'author', user.id) as Route}
        />
      )}
    </Stack>
  )
}

/**
 * The owner's tours with no visitable stop: unlisted for everyone else, so
 * this is the author's only way back to their editor to fix them.
 */
async function NeedsFixingTours({ tours }: { tours: Tour[] }) {
  const { t, lng } = await getT('user-page')
  return (
    <Stack component="section" gap="xs" aria-labelledby="needs-fixing">
      <Title order={2} size="h5" id="needs-fixing">
        {t('Needs fixing')}
      </Title>
      <Text size="sm" c="dimmed">
        {t('These tours have no stop visitors can reach, so only you see them.')}
      </Text>
      {tours.map((tour) => (
        // A plain Link around the Card: `component={Link}` can't cross
        // from this Server Component to Mantine's client Card.
        <Link key={tour.id} href={`/${lng}/tour/${tour.id}/edit` as Route} className="block">
          <Card withBorder padding="sm">
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Text fw={600} lineClamp={2} miw={0}>
                {tour.title}
              </Text>
              <Badge color="orange" variant="light" size="sm" flex="none">
                {t('Needs fixing')}
              </Badge>
            </Group>
          </Card>
        </Link>
      ))}
    </Stack>
  )
}
