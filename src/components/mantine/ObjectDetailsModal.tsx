import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, Object } from '@/payload-types'
import type { WorkSubjects } from '@/lib/subjects'
import {
  Anchor,
  Badge,
  Box,
  Group,
  List,
  ListItem,
  Stack,
  Text,
  Title,
  type MantineBreakpoint,
} from '@mantine/core'
import type { Route } from 'next'
import Link from 'next/link'
import { DetailCover } from './DetailCover'

// Server Component: renders the modal body. Wrap it in the `ObjectModal` shell
// from `./Modal` (client) to get open/close behaviour — never import this file
// from a Client Component: it pulls in `next-i18next/server`, which imports
// `next/root-params` and is invalid in client bundles.
export async function ObjectDetailsContent({
  object,
  hideContents = false,
  lightbox = false,
  coverHiddenFrom,
  subjects,
}: {
  object: Object
  /**
   * The work's author and movement in the visitor's language
   * (`subjectsOfWork`), loaded by the page: this component stays free of
   * database reads so stories can render it.
   */
  subjects?: WorkSubjects
  hideContents?: boolean
  /** Only the object page: in modals no full-screen viewer stacks over the modal. */
  lightbox?: boolean
  /**
   * Hides the inline cover from this breakpoint up. The object page sets
   * `md`: on desktop it shows the cover in its own sticky pane beside these
   * details. Modals leave it unset (cover always inline).
   */
  coverHiddenFrom?: MantineBreakpoint
}) {
  const { t, lng } = await getT('object-details')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const contents = filterPopulated<Content>(object.contents)
  // Author and movement as links to their subject pages (Wikidata import),
  // else the free-text artist the object was created with.
  const { creators = [], movements = [] } = subjects ?? {}
  const subjectHref = (id: string) => `/${lng}/subject/${id}` as Route

  return (
    <Stack gap="sm">
      {/* Photo and, when the object has one, its 3D model; the lightbox only on the object page. */}
      <Box hiddenFrom={coverHiddenFrom}>
        <DetailCover
          pictures={[thumbnail]}
          model={isPopulated(object.model) ? object.model : null}
          title={object.name}
          lightbox={lightbox}
        />
      </Box>
      <Title order={3}>{object.name}</Title>
      {(creators.length > 0 || object.artist || object.dating) && (
        <Text size="sm" c="dimmed">
          {creators.length
            ? creators.map((creator, index) => (
                <span key={creator.id}>
                  {index > 0 && ', '}
                  <Anchor component={Link} href={subjectHref(creator.id)} inherit>
                    {creator.name}
                  </Anchor>
                </span>
              ))
            : object.artist}
          {(creators.length > 0 || object.artist) && object.dating && ' · '}
          {object.dating}
        </Text>
      )}
      {movements.length > 0 && (
        <Group gap={6}>
          {movements.map((movement) => (
            <Badge
              key={movement.id}
              component={Link}
              href={subjectHref(movement.id)}
              variant="light"
              color="gray"
              className="cursor-pointer"
            >
              {movement.name}
            </Badge>
          ))}
        </Group>
      )}
      {object.description && <Text size="sm">{object.description}</Text>}
      {!hideContents && contents.length > 0 && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('Related contents')}
          </Text>
          <List size="sm">
            {contents.map((content) => (
              // `ListItem`, not `List.Item`: server component (see SearchResultCard).
              <ListItem key={content.id}>{content.title}</ListItem>
            ))}
          </List>
        </Stack>
      )}
    </Stack>
  )
}
