import { getT } from '@/i18n.server'
import { normalizeLocale } from '@/lib/localized'
import { getSession } from '@/lib/session'
import { wikidataUrl } from '@/lib/wikidata'
import type { Content } from '@/payload-types'
import { Anchor, Badge, Container, List, ListItem, Stack, Text, Title } from '@mantine/core'
import { ExternalLink } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * A subject's page: an artist, a movement or an event (`subjects`,
 * requirement 5 of `docs/plan/requisiti-18-33.md`). Reached from a work's
 * author and movement (object details) and from the "who's the author?" and
 * "what style is it?" commands. It shows the subject's description, the
 * collection's works linked to it and the contents written about it, with a
 * link to its Wikidata item, the universal identifier behind it.
 */
export default async function SubjectPage({ params }: PageProps<'/[lng]/subject/[id]'>) {
  const { lng, id } = await params
  const locale = normalizeLocale(lng) ?? 'en'
  const { payload } = await getSession()
  // The subject, its works and the labels only need the id: read them
  // together (a missing subject just discards the works query).
  const [{ t }, subject, works] = await Promise.all([
    getT('object-details'),
    payload
      .findByID({
        collection: 'subjects',
        id,
        locale,
        depth: 1,
        populate: { contents: { title: true } },
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
      depth: 0,
      limit: 50,
      select: { name: true, dating: true },
    }),
  ])
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
            <Anchor href={wikidataUrl(subject.wikidataId)} target="_blank" size="sm">
              <ExternalLink size={14} aria-hidden /> {t('On Wikidata')} ({subject.wikidataId})
            </Anchor>
          )}
        </Stack>
        {contents.length > 0 && (
          <Section title={t('Contents about it')}>
            {contents.map((content) => (
              <ListItem key={content.id}>
                <Anchor component={Link} href={`/${lng}/content/${content.id}` as Route}>
                  {content.title}
                </Anchor>
              </ListItem>
            ))}
          </Section>
        )}
        {works.docs.length > 0 && (
          <Section title={t('Works in the collection')}>
            {works.docs.map((work) => (
              <ListItem key={work.id}>
                <Anchor component={Link} href={`/${lng}/object/${work.id}` as Route}>
                  {work.name}
                </Anchor>
                {work.dating && (
                  <Text span size="sm" c="dimmed">
                    {` · ${work.dating}`}
                  </Text>
                )}
              </ListItem>
            ))}
          </Section>
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
