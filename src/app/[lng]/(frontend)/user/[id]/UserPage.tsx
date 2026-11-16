import { BackButton } from '@/components/navigation/BackButton'
import { EditableSection } from '@/components/editing/EditableSection'
import { ProfileForm } from '@/components/editing/forms/ProfileForm'
import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { ArtaroundEmptyState } from '@/components/mantine/ArtaroundEmptyState'
import { ArtaroundTabs } from '@/components/mantine/ArtaroundTabs'
import { LinkButton } from '@/components/editing/LinkButton'
import { MUSEUM_ROLE_ICON } from '@/lib/museum-role-meta'
import { ContentsCarousel } from '@/components/mantine/ContentsCarousel'
import { ToursCarousel } from '@/components/mantine/ToursCarousel'
import { scopedSearchHref } from '@/lib/search-url'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Museum, User } from '@/payload-types'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { ProfileMuseumFilter } from './ProfileMuseumFilter'
import {
  Avatar,
  Badge,
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
import { Amphora, BadgeInfo, ChevronRight, Landmark, Palette, Verified } from 'lucide-react'

/**
 * A visitor's public profile. Phones: one column (identity with the account
 * actions at its top-right, badges, bio, then the tabs). From `md`: a 1140px
 * container with the profile as a column on the left and the tabs (authored
 * tours and contents, info) using the remaining width on the right.
 */
export const UserPage = async ({
  user,
  isSelf = false,
  museumFilter,
  accountActions,
  museumsHref,
}: {
  user: User
  /** The visitor's own profile: inline profile editing. */
  isSelf?: boolean
  /**
   * Museum mode only: the locked museum's name and whether the tours and
   * contents passed in are narrowed to it (`?scope=all` lifts it).
   */
  museumFilter?: { name: string; museumOnly: boolean }
  /** Owner-only actions (sign out), rendered by the route so stories stay server-action free. */
  accountActions?: ReactNode
  /**
   * Owner-only, when they hold a role in a museum: their "Your museums" page
   * (`/[lng]/my-museums`), the one way in now that the bars have no museums menu.
   */
  museumsHref?: Route
}) => {
  const { t, lng } = await getT('user-page')
  const { t: te } = await getT('editing')
  // Authorship is a join (`contents.author` / `tours.author`), hence `.docs`.
  const populatedTours = filterPopulated(user.authoredTours?.docs)
  const populatedContents = filterPopulated(user.authoredContents?.docs)
  // Empty sections address a visitor's profile by its owner's first name.
  const firstName = user.name.firstName || user.name.fullName
  // An empty section under the museum filter says so, instead of claiming
  // the person has made nothing at all.
  const filteredTo = museumFilter?.museumOnly ? museumFilter.name : null

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
            <Stack gap="sm">
              {/* Identity on the left; account actions (sign out) at the top-right
                  corner, where account utilities live, out of the profile's flow. */}
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                <Group align="center" gap="xs" wrap="nowrap" miw={0}>
                  <Indicator
                    color="transparent"
                    offset={6}
                    position="bottom-end"
                    disabled={!user.highestStatus || user.highestStatus === 'none'}
                    label={
                      <ThemeIcon size="1.3em" radius="xl" variant="filled">
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
              <UserBadges user={user} />
              {museumsHref && (
                <LinkButton
                  href={museumsHref}
                  variant="light"
                  color="grape"
                  size="sm"
                  leftSection={<Landmark size={16} aria-hidden />}
                  rightSection={<ChevronRight size={16} aria-hidden />}
                  className="self-start"
                >
                  {t('Your museums')}
                </LinkButton>
              )}
            </Stack>
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
                  <Stack>
                    {museumFilter && (
                      <ProfileMuseumFilter
                        museumName={museumFilter.name}
                        museumOnly={museumFilter.museumOnly}
                      />
                    )}
                    {/* Empty: the section keeps its heading and place. The
                        owner hears what goes there and gets the way to make
                        the first one; a visitor reads a plain statement. */}
                    {populatedTours.length === 0 ? (
                      <ArtaroundEmptyState
                        kind="tour"
                        heading={t('Tours')}
                        title={
                          filteredTo
                            ? t('No tours at {{museum}}', { museum: filteredTo })
                            : isSelf
                              ? t('Your first tour starts here')
                              : t('{{name}} hasn’t created any tours yet', { name: firstName })
                        }
                        description={
                          !filteredTo && isSelf
                            ? t(
                                'Pick the works you love and put them in order: a route to take and share.',
                              )
                            : undefined
                        }
                        action={
                          isSelf
                            ? { label: t('Create a tour'), href: `/${lng}/tour/new` as Route }
                            : undefined
                        }
                      />
                    ) : (
                      <ToursCarousel
                        tours={populatedTours}
                        seeAllHref={scopedSearchHref(lng, 'tours', 'author', user.id) as Route}
                      />
                    )}
                    {populatedContents.length === 0 ? (
                      <ArtaroundEmptyState
                        kind="content"
                        heading={t('Contents')}
                        title={
                          filteredTo
                            ? t('No contents at {{museum}}', { museum: filteredTo })
                            : isSelf
                              ? t('Tell the story of a work')
                              : t('{{name}} hasn’t written any contents yet', { name: firstName })
                        }
                        description={
                          !filteredTo && isSelf
                            ? t(
                                'What you write about a work shows up here, ready for the visitors who stop in front of it.',
                              )
                            : undefined
                        }
                        action={
                          isSelf
                            ? { label: t('Write a content'), href: `/${lng}/content/new` as Route }
                            : undefined
                        }
                      />
                    ) : (
                      <ContentsCarousel
                        contents={populatedContents}
                        seeAllHref={scopedSearchHref(lng, 'contents', 'author', user.id) as Route}
                      />
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
// verified-creator badge and one staff badge per museum, director and
// curator alike, each with its role's icon and its role in the tooltip (a
// generic role badge when the memberships came back unpopulated). Returns
// null when neither applies so no empty row is rendered.
export async function UserBadges({ user }: { user: User }) {
  const { t } = await getT('user-page')
  const museumsOf = (docs: (string | { museum: string | Museum })[] | undefined) =>
    filterPopulated(
      (docs ?? []).map((membership) =>
        typeof membership === 'object' ? membership.museum : membership,
      ),
    )
  // Museums where the user holds the verified-creator badge (verified memberships).
  const verifiedMuseums = museumsOf(user.verifiedAt?.docs)
  const curatorDocs = user.curatorOf?.docs ?? []
  const directorDocs = user.directorOf?.docs ?? []
  // Directors first (the higher role), then curators: both are staff.
  const staff = [
    ...museumsOf(directorDocs).map((museum) => ({
      museum,
      role: 'director' as const,
      tooltip: t('Director at {{museum}}', { museum: museum.name }),
    })),
    ...museumsOf(curatorDocs).map((museum) => ({
      museum,
      role: 'curator' as const,
      tooltip: t('Curator at {{museum}}', { museum: museum.name }),
    })),
  ]

  // Note: filterPopulated returns [] (truthy) when empty, so length checks are
  // required here — a bare truthiness check would render badges for everyone.
  // The generic role badge covers join rows whose memberships are not
  // populated (IDs only): the user holds the role but no museum resolved.
  const hasStaffRows = curatorDocs.length > 0 || directorDocs.length > 0
  const genericRole = directorDocs.length > 0 ? 'director' : 'curator'
  const GenericIcon = MUSEUM_ROLE_ICON[genericRole]
  const VerifiedIcon = MUSEUM_ROLE_ICON.verified

  if (verifiedMuseums.length === 0 && !hasStaffRows) return null

  return (
    <Group gap="xs">
      {verifiedMuseums.length > 0 && (
        <Tooltip label={t('Verified creator tooltip')} withArrow>
          <Badge size="sm" leftSection={<VerifiedIcon size={14} aria-hidden />}>
            {t('Verified creator')}
          </Badge>
        </Tooltip>
      )}
      {hasStaffRows &&
        (staff.length > 0 ? (
          staff.map(({ museum, role, tooltip }) => {
            const Icon = MUSEUM_ROLE_ICON[role]
            return (
              <Tooltip key={`${role}-${museum.id}`} label={tooltip} withArrow>
                <Badge color="green" size="sm" leftSection={<Icon size={14} aria-hidden />}>
                  {museum.name}
                </Badge>
              </Tooltip>
            )
          })
        ) : (
          // Unpopulated rows: the role is known from the join it came from.
          <Badge color="green" size="sm" leftSection={<GenericIcon size={14} aria-hidden />}>
            {genericRole === 'director' ? t('Director') : t('Curator')}
          </Badge>
        ))}
    </Group>
  )
}
