import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { isLocked, isPaid } from '@/lib/price'
import type {
  Content,
  ContentImage,
  Difficulty,
  Museum,
  MuseumCategory,
  Object,
  Tour,
  User,
} from '@/payload-types'
import {
  Avatar,
  Badge,
  Card,
  Group,
  Image,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  Baby,
  BookOpen,
  ChevronRight,
  Landmark,
  LockOpen,
  Route as RouteIcon,
  Star,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Everything around a content's text on its canonical page
 * (`/[lng]/content/[id]`): what kind of read it is (difficulty, audience,
 * rating, price, categories), its pictures and sources, the object it is
 * about and that object's museum, who wrote it, the tours that include it and
 * the other contents about the same object.
 *
 * Presentational only: `page.tsx` loads every relation as the visitor (so
 * access rules hold) in the visitor's language, and passes the reduced docs
 * here; each section hides itself when its data is missing. Async Server
 * Component (`getT`), so links are plain `next/link` elements rather than
 * Mantine `component={Link}` props, which can't cross the client boundary.
 */

export type ContentDetailsObject = Pick<
  Object,
  'id' | 'name' | 'description' | 'artist' | 'dating' | 'thumbnail'
>
export type ContentDetailsMuseum = Pick<Museum, 'id' | 'name' | 'shortDescription'>
export type ContentDetailsAuthor = Pick<User, 'id' | 'name' | 'avatar' | 'bio'>
export type ContentDetailsTour = Pick<Tour, 'id' | 'title' | 'thumbnail' | 'museum'>
export type ContentDetailsRelated = Pick<
  Content,
  'id' | 'title' | 'difficulty' | 'readingTimeMins' | 'images'
>

export type ContentDetailsProps = {
  /** The page's localized content (depth 0): badges, sources, copyright, dates. */
  content: Pick<
    Content,
    | 'difficulty'
    | 'audience'
    | 'price'
    | 'body'
    | 'lfrs'
    | 'sources'
    | 'copyright'
    | 'createdAt'
    | 'updatedAt'
  >
  object?: ContentDetailsObject | null
  museum?: ContentDetailsMuseum | null
  author?: ContentDetailsAuthor | null
  categories?: Pick<MuseumCategory, 'id' | 'name'>[]
  images?: Pick<ContentImage, 'id' | 'url' | 'thumbnailURL' | 'alt'>[]
  tours?: ContentDetailsTour[]
  /** Other contents about the same object, without this one. */
  related?: ContentDetailsRelated[]
}

export async function ContentDetails({
  content,
  object,
  museum,
  author,
  categories = [],
  images = [],
  tours = [],
  related = [],
}: ContentDetailsProps) {
  const { t, lng } = await getT('content-page')
  // Literal keys so i18next-cli keeps them (DIFFICULTY_LABEL_KEY is dynamic).
  const difficultyLabel: Record<Difficulty, string> = {
    easy: t('Easy'),
    medium: t('Medium'),
    hard: t('Hard'),
  }
  const ratingsCount = content.lfrs?.ratingsCount ?? 0
  const ratingsAverage = content.lfrs?.ratingsAverage
  const objectImage = isPopulated(object?.thumbnail) ? object.thumbnail : null
  const sources = content.sources ?? []
  const authorAvatar = isPopulated(author?.avatar) ? author.avatar : null
  // Only read inside the `object &&` section below.
  const objectHref = `/${lng}/object/${object?.id}` as Route

  return (
    <Stack gap="xl">
      {/* At a glance: icon + label on every badge, never color alone. */}
      <Group gap="xs">
        <DifficultyBadge difficulty={content.difficulty} size="lg" variant="light">
          {difficultyLabel[content.difficulty]}
        </DifficultyBadge>
        {content.audience === 'children' && (
          <Badge size="lg" variant="light" color="pink" leftSection={<Baby size={14} />}>
            {t('For children')}
          </Badge>
        )}
        {ratingsCount > 0 && ratingsAverage != null && (
          <Badge
            size="lg"
            variant="light"
            color="yellow"
            leftSection={<Star size={14} fill="currentColor" />}
            aria-label={t('Rated {{rating}} out of 5', { rating: ratingsAverage.toFixed(1) })}
            className="tabular-nums"
          >
            {`${ratingsAverage.toFixed(1)} (${ratingsCount})`}
          </Badge>
        )}
        {/* A paid content shows its price while locked; once readable (bought,
            or the visitor is its author or museum staff) it says so instead. */}
        {isLocked(content) ? (
          <LockedPriceBadge price={content.price ?? 0} size="lg" />
        ) : isPaid(content) ? (
          <Badge size="lg" variant="light" color="teal" leftSection={<LockOpen size={14} />}>
            {t('Unlocked')}
          </Badge>
        ) : null}
        {categories.map((category) => (
          <Badge key={category.id} size="lg" variant="outline" color="gray">
            {category.name}
          </Badge>
        ))}
      </Group>

      {images.some((image) => image.url) && (
        <Section title={t('Pictures')}>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            {images
              .filter((image) => image.url)
              .map((image) => (
                <Image
                  key={image.id}
                  src={image.thumbnailURL ?? image.url}
                  alt={image.alt ?? ''}
                  radius="md"
                  h={160}
                  fit="cover"
                />
              ))}
          </SimpleGrid>
        </Section>
      )}

      {sources.length > 0 && (
        <Section title={t('Sources')}>
          {/* Explicit marker: Tailwind's preflight strips `ol` numbering. */}
          <List type="ordered" listStyleType="decimal" size="sm" spacing={4}>
            {sources.map((source, index) => (
              // `ListItem`, not `List.Item`: server component (see SearchResultCard).
              <ListItem key={source.id ?? index}>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--mantine-color-anchor) underline-offset-2 hover:underline"
                  >
                    {source.label}
                  </a>
                ) : (
                  source.label
                )}
              </ListItem>
            ))}
          </List>
        </Section>
      )}

      {object && (
        <Section title={t('About the object')}>
          {/* Two rows: the object's identity (picture, name, artist and date)
              side by side, then its description across the full card width
              with the way out to the museum and the object's page beneath it,
              so the card holds everything about the object, CTA included. */}
          <Card withBorder radius="md" padding="sm">
            <Stack gap="sm">
              <Group align="center" gap="md" wrap="nowrap">
                <Link
                  href={objectHref}
                  className="shrink-0 rounded-md outline-offset-2 focus-visible:outline-2"
                  tabIndex={-1}
                  aria-hidden
                >
                  <Image
                    src={objectImage?.thumbnailURL ?? objectImage?.url ?? PLACEHOLDER_IMAGE}
                    alt=""
                    w={{ base: 72, sm: 96 }}
                    h={{ base: 72, sm: 96 }}
                    radius="md"
                    fit="cover"
                  />
                </Link>
                <Stack gap={6} miw={0} className="flex-1">
                  <Link href={objectHref} className="text-inherit no-underline hover:underline">
                    <Title order={3} size="h4" lineClamp={2}>
                      {object.name}
                    </Title>
                  </Link>
                  {(object.artist || object.dating) && (
                    <Text size="sm" c="dimmed">
                      {[object.artist, object.dating].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </Stack>
              </Group>
              {object.description && (
                <Text size="sm" lineClamp={3}>
                  {object.description}
                </Text>
              )}
              <Group gap="xs">
                {museum && (
                  <Link
                    href={`/${lng}/museum/${museum.id}` as Route}
                    className="inline-flex w-fit items-center gap-1 text-sm text-(--mantine-color-blue-8) hover:underline"
                  >
                    <Landmark size={14} aria-hidden />
                    {museum.name}
                  </Link>
                )}
                {/* `ms-auto` keeps the CTA at the right edge, with or without a museum. */}
                <Link
                  href={objectHref}
                  className="ms-auto inline-flex w-fit items-center gap-1 text-sm font-semibold text-(--mantine-color-anchor) hover:underline"
                >
                  {t('View the object')}
                  <ChevronRight size={14} aria-hidden />
                </Link>
              </Group>
            </Stack>
          </Card>
        </Section>
      )}

      {author && (
        <Section title={t('Written by')}>
          <Link
            href={`/${lng}/user/${author.id}` as Route}
            className="-mx-2 block rounded-md px-2 py-1 text-inherit no-underline transition-colors hover:bg-(--mantine-color-default-hover)"
          >
            <Group gap="sm" wrap="nowrap">
              <Avatar
                src={authorAvatar?.thumbnailURL ?? authorAvatar?.url}
                name={author.name.fullName}
                alt={author.name.fullName}
                color="initials"
                size="md"
              />
              <Stack gap={0} miw={0}>
                <Text fw={600} size="sm">
                  {author.name.fullName}
                </Text>
                {author.bio && (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {author.bio}
                  </Text>
                )}
              </Stack>
            </Group>
          </Link>
        </Section>
      )}

      {tours.length > 0 && (
        <Section title={t('In these tours')}>
          <Stack gap="xs">
            {tours.map((tour) => {
              const cover = isPopulated(tour.thumbnail) ? tour.thumbnail : null
              const tourMuseum = isPopulated(tour.museum) ? tour.museum.name : null
              return (
                <LinkRow
                  key={tour.id}
                  href={`/${lng}/tour/${tour.id}` as Route}
                  image={cover?.url ? (cover.thumbnailURL ?? cover.url) : null}
                  fallbackIcon={<RouteIcon size={22} aria-hidden />}
                  fallbackColor="grape"
                  title={tour.title}
                  subtitle={tourMuseum}
                />
              )
            })}
          </Stack>
        </Section>
      )}

      {related.length > 0 && (
        <Section title={t('More about this object')}>
          <Stack gap="xs">
            {related.map((item) => {
              // Its own picture, else the object's: they all show the same piece.
              const image = filterPopulated<ContentImage>(item.images).find((i) => i.url)
              return (
                <LinkRow
                  key={item.id}
                  href={`/${lng}/content/${item.id}` as Route}
                  image={
                    image
                      ? (image.thumbnailURL ?? image.url)
                      : (objectImage?.thumbnailURL ?? objectImage?.url)
                  }
                  fallbackIcon={<BookOpen size={22} aria-hidden />}
                  fallbackColor="teal"
                  title={item.title}
                >
                  <Group gap={6}>
                    <DifficultyBadge difficulty={item.difficulty} size="xs" variant="light">
                      {difficultyLabel[item.difficulty]}
                    </DifficultyBadge>
                    {item.readingTimeMins ? (
                      <DurationBadge
                        time={item.readingTimeMins}
                        size="xs"
                        variant="light"
                        color="gray"
                      />
                    ) : null}
                  </Group>
                </LinkRow>
              )
            })}
          </Stack>
        </Section>
      )}

      {/* Credits: the required copyright line and when the text last changed. */}
      <Stack gap={2}>
        {content.copyright && (
          <Text size="xs" c="dimmed">
            {content.copyright}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {t('Last updated {{date}}', {
            date: new Intl.DateTimeFormat(lng, { dateStyle: 'long' }).format(
              new Date(content.updatedAt),
            ),
          })}
        </Text>
      </Stack>
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm" component="section">
      <Title order={2} size="h4">
        {title}
      </Title>
      {children}
    </Stack>
  )
}

/**
 * One related document as a single link (tour or content): a 56px picture,
 * or the identity-colored icon when it has none, its title and details.
 * Same shape as the tour page's stop rows.
 */
function LinkRow({
  href,
  image,
  fallbackIcon,
  fallbackColor,
  title,
  subtitle,
  children,
}: {
  href: Route
  image?: string | null
  fallbackIcon: ReactNode
  fallbackColor: string
  title: string
  subtitle?: string | null
  children?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="-mx-2 block rounded-md px-2 py-1 text-inherit no-underline transition-colors hover:bg-(--mantine-color-default-hover)"
    >
      <Group gap="sm" wrap="nowrap">
        {image ? (
          <Image src={image} alt="" w={56} h={56} radius="md" fit="cover" className="shrink-0" />
        ) : (
          <ThemeIcon
            size={56}
            radius="md"
            variant="light"
            color={fallbackColor}
            className="shrink-0"
          >
            {fallbackIcon}
          </ThemeIcon>
        )}
        <Stack gap={6} miw={0} className="flex-1">
          <Text fw={600} size="sm" lineClamp={2}>
            {title}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {subtitle}
            </Text>
          )}
          {children}
        </Stack>
        <ChevronRight size={18} className="shrink-0 text-(--mantine-color-dimmed)" aria-hidden />
      </Group>
    </Link>
  )
}
