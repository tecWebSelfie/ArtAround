import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, Object } from '@/payload-types'
import type { WorkSubjects } from '@/lib/subjects'
import {
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
import { Fragment } from 'react'
import { formatDuration } from '@/lib/duration'
// Link wrappers: this server component can't pass `component={Link}` to Mantine.
import { LinkAnchor, LinkBadge } from './LinkAnchor'
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
  headingOrder = 2,
  subjectLinks = true,
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
  /**
   * The work's name is the page's `h1` on the object page; in a dialog it
   * comes under the dialog's own title, so `h2`.
   */
  headingOrder?: 1 | 2
  /**
   * Author and movement as links to their subject pages. Off over the
   * museum map: a link there would leave the visit for another page.
   */
  subjectLinks?: boolean
}) {
  const { t, lng } = await getT('object-details')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const contents = filterPopulated<Content>(object.contents)
  // Author and movement as links to their subject pages (Wikidata import),
  // else the free-text artist the object was created with.
  const { creators = [], movements = [] } = subjects ?? {}
  const subjectHref = (id: string) => `/${lng}/subject/${id}` as Route
  // The museum's own record of the work, when it keeps one: the facts a label
  // in the room would carry. Rows without a value are left out.
  const facts = [
    { label: t('Inventory number'), value: object.inventoryNumber },
    { label: t('Provenance'), value: object.provenance },
    { label: t('Credit line'), value: object.creditLine },
    { label: t('Rights'), value: object.rights },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value?.trim()))

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
      <Title order={headingOrder} size={headingOrder === 1 ? 'h2' : 'h3'} textWrap="balance">
        {object.name}
      </Title>
      {(creators.length > 0 || object.artist || object.dating) && (
        <Text size="sm" c="dimmed">
          {creators.length
            ? creators.map((creator, index) => (
                <span key={creator.id}>
                  {index > 0 && ', '}
                  {subjectLinks ? (
                    <LinkAnchor href={subjectHref(creator.id)} inherit>
                      {creator.name}
                    </LinkAnchor>
                  ) : (
                    creator.name
                  )}
                </span>
              ))
            : object.artist}
          {(creators.length > 0 || object.artist) && object.dating && ' · '}
          {object.dating}
        </Text>
      )}
      {movements.length > 0 && (
        <Group gap={6}>
          {movements.map((movement) =>
            subjectLinks ? (
              <LinkBadge
                key={movement.id}
                href={subjectHref(movement.id)}
                variant="light"
                color="gray"
                className="cursor-pointer"
              >
                {movement.name}
              </LinkBadge>
            ) : (
              <Badge key={movement.id} variant="light" color="gray">
                {movement.name}
              </Badge>
            ),
          )}
        </Group>
      )}
      {object.description && (
        <Text size={headingOrder === 1 ? 'md' : 'sm'} maw="68ch">
          {object.description}
        </Text>
      )}
      {facts.length > 0 && (
        // A definition list: label beside value from a phone up, so the
        // record scans like a museum label.
        <Box
          component="dl"
          m={0}
          className="grid grid-cols-[auto_1fr] gap-x-(--mantine-spacing-md) gap-y-(--mantine-spacing-xs) text-sm"
        >
          {facts.map(({ label, value }) => (
            <Fragment key={label}>
              <Text component="dt" size="sm" c="dimmed">
                {label}
              </Text>
              <Text component="dd" size="sm" m={0}>
                {value}
              </Text>
            </Fragment>
          ))}
        </Box>
      )}
      {!hideContents && contents.length > 0 && (
        // Each content is a way in: its page, with how long it takes.
        <Stack gap={4}>
          <Title order={headingOrder === 1 ? 2 : 3} size="h5">
            {t('Contents about it')}
          </Title>
          <List size="sm" spacing={4}>
            {contents.map((content) => (
              // `ListItem`, not `List.Item`: server component (see SearchResultCard).
              <ListItem key={content.id}>
                <LinkAnchor href={`/${lng}/content/${content.id}` as Route} size="sm">
                  {content.title}
                </LinkAnchor>
                {content.durationSeconds ? (
                  <Text span size="sm" c="dimmed">
                    {` · ${formatDuration(content.durationSeconds)}`}
                  </Text>
                ) : null}
              </ListItem>
            ))}
          </List>
        </Stack>
      )}
    </Stack>
  )
}
