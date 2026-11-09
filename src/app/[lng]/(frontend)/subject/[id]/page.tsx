import { getT } from '@/i18n.server'
import { normalizeLocale } from '@/lib/localized'
import { asViewer, getSession } from '@/lib/session'
import { LinkButton } from '@/components/editing/LinkButton'
import { wikidataUrl } from '@/lib/wikidata'
import type { Content } from '@/payload-types'
import {
  Anchor,
  AspectRatio,
  Badge,
  Container,
  Group,
  Image,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { isPopulated } from '@/lib/isPopulated'
import { PICTURE_SELECT, pictureSrc } from '@/lib/picture'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { ExternalLink, FilePlus } from 'lucide-react'
import type { Route } from 'next'
// A server page: links go through the client wrapper, not `component={Link}`.
import { LinkAnchor } from '@/components/mantine/LinkAnchor'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'

/** The tab names the artist, movement or event. */
export async function generateMetadata({
  params,
}: PageProps<'/[lng]/subject/[id]'>): Promise<Metadata> {
  const { lng, id } = await params
  const { payload } = await getSession()
  const subject = await payload
    .findByID({
      collection: 'subjects',
      id,
      depth: 0,
      select: { name: true },
      locale: normalizeLocale(lng) ?? 'en',
    })
    .catch(() => null)
  return subject ? { title: subject.name } : {}
}

/**
 * A subject's page: an artist, a movement or an event (`subjects`,
 * requirement 5 of `docs/plan/requisiti-18-33.md`). Reached from a work's
 * author and movement (object details) and from the "who's the author?" and
 * "what style is it?" commands. It shows the subject's description, the
 * collection's works linked to it and the contents written about it, with a
 * link to its Wikidata item, the universal identifier behind it. Signed-in
 * visitors can write a new content about it (`/content/new?subject=`).
 */
export default async function SubjectPage({ params }: PageProps<'/[lng]/subject/[id]'>) {
  const { lng, id } = await params
  const locale = normalizeLocale(lng) ?? 'en'
  const { payload, user } = await getSession()
  // As the visitor: a private content about the subject stays hidden from
  // everyone but its author and group guests (`src/lib/visibility.ts`).
  const viewer = await asViewer()
  // The subject, its works and the labels only need the id: read them
  // together (a missing subject just discards the works query).
  const reads = Promise.all([
    payload
      .findByID({
        collection: 'subjects',
        id,
        locale,
        depth: 1,
        populate: { contents: { title: true } },
        ...viewer,
      })
      .catch(() => null),
    payload.find({
      collection: 'objects',
      where: {
        or: [
          { creators: { contains: id } },
          { movements: { contains: id } },
          { events: { contains: id } },
        ],
      },
      locale,
      depth: 1,
      limit: 50,
      select: { name: true, dating: true, thumbnail: true },
      populate: { objectsThumbnails: PICTURE_SELECT },
    }),
  ])
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('object-details')
  const [subject, works] = await reads
  if (!subject) notFound()
  const contents = (subject.contents ?? []).filter(
    (content): content is Content => typeof content === 'object',
  )
  const kindLabel = {
    person: t('Person'),
    movement: t('Movement or style'),
    event: t('Event'),
  }[subject.kind]

  return (
    <Container size="sm" py="md">
      <Stack gap="lg">
        <Stack gap="xs">
          <Badge variant="light" color="gray">
            {kindLabel}
          </Badge>
          <Title order={1}>{subject.name}</Title>
          {subject.description && <Text>{subject.description}</Text>}
          {subject.wikidataId && (
            <Anchor
              href={wikidataUrl(subject.wikidataId)}
              target="_blank"
              size="sm"
              className="inline-flex items-center gap-1 self-start"
            >
              <ExternalLink size={14} aria-hidden /> {t('On Wikidata')} ({subject.wikidataId})
            </Anchor>
          )}
        </Stack>
        {contents.length > 0 && (
          <Section title={t('Contents about it')}>
            {contents.map((content) => (
              <ListItem key={content.id}>
                <LinkAnchor href={`/${lng}/content/${content.id}` as Route}>
                  {content.title}
                </LinkAnchor>
              </ListItem>
            ))}
          </Section>
        )}
        {works.docs.length > 0 && (
          // The works as pictures: a subject is mostly known by what it made
          // or inspired, and a name list said little. Two columns on phones,
          // three from sm; works without a photo keep a neutral tile.
          <Stack gap="xs" component="section">
            <Title order={2} size="h4">
              {t('Works in the collection')}
            </Title>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
              {works.docs.map((work) => {
                const photo = isPopulated(work.thumbnail) ? work.thumbnail : null
                return (
                  <LinkAnchor
                    key={work.id}
                    href={`/${lng}/object/${work.id}` as Route}
                    underline="never"
                    c="inherit"
                    className="block"
                  >
                    <AspectRatio ratio={4 / 5}>
                      <Image
                        src={pictureSrc(photo, 'card') ?? PLACEHOLDER_IMAGE}
                        alt=""
                        radius="md"
                        fit="cover"
                        bg="gray.1"
                      />
                    </AspectRatio>
                    <Text size="sm" fw={600} mt={6} lineClamp={2}>
                      {work.name}
                    </Text>
                    {work.dating && (
                      <Text size="xs" c="dimmed">
                        {work.dating}
                      </Text>
                    )}
                  </LinkAnchor>
                )
              })}
            </SimpleGrid>
          </Stack>
        )}
        {user && (
          <Group>
            <LinkButton
              href={`/${lng}/content/new?subject=${id}` as Route}
              variant="light"
              leftSection={<FilePlus size={16} aria-hidden />}
            >
              {t('Write a content about it')}
            </LinkButton>
          </Group>
        )}
      </Stack>
    </Container>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xs" component="section">
      <Title order={2} size="h4">
        {title}
      </Title>
      {/* `ListItem`, not `List.Item`: server component (see SearchResultCard). */}
      <List spacing="xs">{children}</List>
    </Stack>
  )
}
